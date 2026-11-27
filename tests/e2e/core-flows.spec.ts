import { expect, test } from "@playwright/test";
import {
  createMagicLogin,
  E2E_ADMIN_EMAIL,
  E2E_EMPLOYER_EMAIL,
  E2E_JOB_ID,
  E2E_SEEKER_EMAIL,
  E2E_SEEKER_PHONE,
  getOnlyApplication,
  pool,
  resetAndSeedDatabase,
  seedSeekerWithApplication,
} from "./helpers";

test.beforeEach(async () => {
  await resetAndSeedDatabase();
});

test.afterAll(async () => {
  await pool.end();
});

test("health check verifies the real database connection", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
    database: "up",
  });
});

test("seeker applies; employer cannot read contact data until contacted", async ({
  page,
  browser,
}) => {
  const loginPath = await createMagicLogin({
    email: E2E_SEEKER_EMAIL,
    intendedRole: "seeker",
    locale: "zh",
    nextPath: `/job/${E2E_JOB_ID}`,
  });
  await page.goto(loginPath);
  await expect(page).toHaveURL(new RegExp(`/job/${E2E_JOB_ID}$`));

  await page.getByRole("button", { name: "一键投递" }).click();
  const modal = page.locator("div.fixed.inset-0");
  await modal.getByLabel("姓名").fill("测试求职者");
  await modal.getByLabel("电话 / 微信号").fill(E2E_SEEKER_PHONE);
  await modal.getByRole("button", { name: /收银员/ }).click();
  await modal.getByRole("button", { name: "提交投递" }).click();
  await expect(modal.getByText("投递成功", { exact: false })).toBeVisible();

  const application = await getOnlyApplication();
  expect(application.status).toBe("submitted");
  expect(application.contact_revealed).toBe(false);

  await page.goto("/me/applications");
  await expect(
    page.getByRole("heading", { name: "百元店收银员" })
  ).toBeVisible();

  const secretWechat = "wechat_must_not_leak_e2e";
  await pool.query("UPDATE users SET wechat = $1 WHERE email = $2", [
    secretWechat,
    E2E_SEEKER_EMAIL,
  ]);

  const employerContext = await browser.newContext({
    baseURL: test.info().project.use.baseURL as string,
  });
  try {
    const employerPage = await employerContext.newPage();
    const employerLogin = await createMagicLogin({
      email: E2E_EMPLOYER_EMAIL,
      intendedRole: "employer",
      locale: "zh",
      nextPath: `/employer/job/${E2E_JOB_ID}`,
    });
    await employerPage.goto(employerLogin);
    await expect(employerPage).toHaveURL(
      new RegExp(`/employer/job/${E2E_JOB_ID}$`)
    );
    await expect(
      employerPage.getByText("标记已联系后可见联系方式")
    ).toBeVisible();

    // Visual hiding alone is insufficient: none of these values may appear
    // anywhere in the HTML or serialized RSC payload before contact is revealed.
    const beforeContact = await employerPage.content();
    expect(beforeContact).not.toContain(E2E_SEEKER_PHONE);
    expect(beforeContact).not.toContain(secretWechat);
    expect(beforeContact).not.toContain(E2E_SEEKER_EMAIL);

    await employerPage
      .getByRole("button", { name: "标记已联系" })
      .click();
    await expect(
      employerPage.getByText(E2E_SEEKER_PHONE, { exact: true })
    ).toBeVisible();

    const contacted = await getOnlyApplication();
    expect(contacted.status).toBe("contacted");
    expect(contacted.contact_revealed).toBe(true);
  } finally {
    await employerContext.close();
  }
});

test("Spanish browsing, login fallback and internal links stay under /es", async ({
  page,
}) => {
  await page.goto(`/es/job/${E2E_JOB_ID}`);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(
    page.getByRole("heading", { name: "Cajero/a para bazar todo a cien" })
  ).toBeVisible();

  const applyLink = page.getByRole("link", { name: "Postular con un clic" });
  const href = await applyLink.getAttribute("href");
  expect(href).toMatch(/^\/es\/login\?/);
  expect(href).toContain(`next=%2Fes%2Fjob%2F${E2E_JOB_ID}`);

  const loginPath = await createMagicLogin({
    email: E2E_SEEKER_EMAIL,
    intendedRole: "seeker",
    locale: "es",
  });
  await page.goto(loginPath);
  await expect(page).toHaveURL(/\/es\/me$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  await page.getByRole("link", { name: /Busco empleo/ }).click();
  await expect(page).toHaveURL(/\/es\/me\/posts$/);
});

test("an existing account keeps its role and wrong-role guards keep locale", async ({
  page,
}) => {
  // Deliberately request seeker at login: the existing employer identifier
  // must still win, preserving the one-account-one-role product invariant.
  const loginPath = await createMagicLogin({
    email: E2E_EMPLOYER_EMAIL,
    intendedRole: "seeker",
    locale: "es",
  });
  await page.goto(loginPath);
  await expect(page).toHaveURL(/\/es\/employer$/);

  await page.goto("/es/me");
  await expect(page).toHaveURL(
    /\/es\/role-mismatch\?needed=seeker&have=employer$/
  );
  await expect(
    page.getByRole("heading", { name: "Esta función necesita otra cuenta" })
  ).toBeVisible();
});

test("an eligible seeker publishes one review and the store aggregate updates", async ({
  page,
}) => {
  await seedSeekerWithApplication();
  const loginPath = await createMagicLogin({
    email: E2E_SEEKER_EMAIL,
    intendedRole: "seeker",
    locale: "zh",
    nextPath: "/store/store_hualian",
  });
  await page.goto(loginPath);

  const comment = "工时和薪资都与岗位描述一致。";
  await page.getByRole("button", { name: "写评价" }).click();
  await page.getByRole("button", { name: "5 星" }).click();
  await page.getByLabel("评价内容").fill(comment);
  await page.getByRole("button", { name: "发布评价" }).click();
  await expect(page.getByText("评价已发布", { exact: false })).toBeVisible();
  await expect(page.getByText(comment, { exact: true })).toBeVisible();

  const reviewRows = await pool.query(
    "SELECT rating, comment FROM reviews WHERE store_id = 'store_hualian'"
  );
  expect(reviewRows.rows).toEqual([{ rating: 5, comment }]);
  const storeRows = await pool.query(
    "SELECT rating_avg, rating_count FROM stores WHERE id = 'store_hualian'"
  );
  expect(Number(storeRows.rows[0].rating_avg)).toBe(5);
  expect(storeRows.rows[0].rating_count).toBe(1);

  await page.reload();
  await expect(page.getByText("你已评价过该门店", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "发布评价" })).toHaveCount(0);
});

test("a user report reaches the admin queue and can be resolved", async ({
  page,
  browser,
}) => {
  await seedSeekerWithApplication();
  const seekerLogin = await createMagicLogin({
    email: E2E_SEEKER_EMAIL,
    intendedRole: "seeker",
    locale: "zh",
    nextPath: `/job/${E2E_JOB_ID}`,
  });
  await page.goto(seekerLogin);
  await page.getByRole("button", { name: "举报岗位" }).click();
  const modal = page.locator("div.fixed.inset-0");
  const reason = "E2E 举报：岗位信息不实";
  await modal.locator("textarea").fill(reason);
  await modal.getByRole("button", { name: "提交举报" }).click();
  await expect(modal.getByText("举报已提交", { exact: false })).toBeVisible();

  const adminContext = await browser.newContext({
    baseURL: test.info().project.use.baseURL as string,
  });
  try {
    const adminPage = await adminContext.newPage();
    const adminLogin = await createMagicLogin({
      email: E2E_ADMIN_EMAIL,
      intendedRole: "employer",
      locale: "zh",
      nextPath: "/admin/reports",
    });
    await adminPage.goto(adminLogin);
    await expect(adminPage).toHaveURL(/\/admin\/reports$/);
    await expect(adminPage.getByText(reason, { exact: false })).toBeVisible();
    await expect(
      adminPage.getByRole("link", { name: "百元店收银员" })
    ).toHaveAttribute("href", `/job/${E2E_JOB_ID}`);

    await adminPage.getByRole("button", { name: "标记已处理" }).click();
    await expect(adminPage.getByText("没有符合条件的举报")).toBeVisible();
    const reportRows = await pool.query("SELECT status FROM reports");
    expect(reportRows.rows).toEqual([{ status: "resolved" }]);
  } finally {
    await adminContext.close();
  }
});

test("a Spanish owner creates a store and publishes a job without Chinese", async ({
  page,
}) => {
  const loginPath = await createMagicLogin({
    email: E2E_EMPLOYER_EMAIL,
    intendedRole: "employer",
    locale: "es",
    nextPath: "/employer",
  });
  await page.goto(loginPath);

  await page.getByRole("button", { name: "+ Nueva tienda" }).click();
  const storeModal = page.locator("div.fixed.inset-0");
  await storeModal.getByLabel("Nombre en español").fill("Bar Puerto");
  await storeModal.getByLabel("Distrito").fill("Centro");
  await storeModal.getByLabel("Dirección completa").fill("Calle Mayor 1, Madrid");
  await storeModal.getByLabel("Tipo de tienda").fill("Bar");
  await storeModal.getByRole("button", { name: "Crear tienda" }).click();
  await expect(storeModal).toHaveCount(0);

  await page.goto("/es/employer/new");
  await page.getByLabel("Elige la tienda").selectOption({ label: "Bar Puerto" });
  await page
    .getByLabel("Nombre del puesto (español)")
    .fill("Camarero de barra");
  await page.getByLabel("Salario mínimo").fill("1200");
  await page.getByLabel("Salario máximo").fill("1400");
  await page.getByLabel("Horario").fill("Lunes a viernes 08:00-16:00");
  await page.getByLabel("Idioma requerido").fill("Español");
  const description = "Atención al cliente y servicio de barra.";
  await page.getByLabel("Descripción (español)").fill(description);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Empleo publicado")).toBeVisible();

  const storeResult = await pool.query(
    "SELECT name_zh, name_es FROM stores WHERE name_es = 'Bar Puerto'"
  );
  expect(storeResult.rows).toEqual([
    { name_zh: "Bar Puerto", name_es: "Bar Puerto" },
  ]);
  const jobResult = await pool.query(
    "SELECT id, title_zh, title_es, description_zh, description_es FROM jobs WHERE title_es = 'Camarero de barra'"
  );
  expect(jobResult.rows).toHaveLength(1);
  expect(jobResult.rows[0]).toMatchObject({
    title_zh: "Camarero de barra",
    title_es: "Camarero de barra",
    description_zh: description,
    description_es: description,
  });

  await page.goto(`/es/job/${jobResult.rows[0].id}`);
  await expect(
    page.getByRole("heading", { name: "Camarero de barra" })
  ).toBeVisible();
});
