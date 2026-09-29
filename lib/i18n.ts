export type Locale = "zh" | "es";

export const locales: Locale[] = ["zh", "es"];
export const defaultLocale: Locale = "zh";

type Dict = Record<string, string>;

const zh: Dict = {
  "app.name": "店聘",

  "nav.seeker.jobs": "找工",
  "nav.seeker.applications": "投递",
  "nav.seeker.me": "我的",
  "nav.employer.dashboard": "工作台",
  "nav.employer.post": "发布",
  "nav.employer.me": "我的",

  "common.language": "中文",
  "common.languageSwitch": "Español",
  "common.loading": "加载中…",
  "common.comingSoon": "敬请期待",
  "common.back": "返回",
  "common.reset": "重置",
  "common.apply": "应用",
  "common.all": "不限",
  "common.yes": "是",
  "common.no": "否",
  "common.month": "月",
  "common.perMonth": "元/月",

  "home.title": "找工作",
  "home.citySwitch": "切换城市",
  "home.resultsCount": "共 {count} 个岗位",
  "home.empty": "没有符合条件的岗位，试试调整筛选条件",
  "home.filters.jobType": "工种",
  "home.filters.mealsIncluded": "包吃住",
  "home.filters.residenceOk": "可无居留",
  "home.filters.salaryMin": "薪资下限（元/月）",
  "home.filters.title": "筛选",

  "job.salaryPeriod.hour": "时",
  "job.salaryPeriod.day": "天",
  "job.salaryPeriod.month": "月",
  "job.mealsIncluded": "包吃住",
  "job.mealsNotIncluded": "不包吃住",
  "job.liveIn": "可住宿",
  "job.headcount": "招 {count} 人",
  "job.viewDetail": "查看详情",
  "job.views": "{count} 次浏览",

  "residenceRequired.none": "居留不限",
  "residenceRequired.prefer": "有居留优先",
  "residenceRequired.required": "必须有居留",

  "residenceStatus.有居留": "有居留",
  "residenceStatus.办理中": "办理中",
  "residenceStatus.学生居留": "学生居留",
  "residenceStatus.家庭居留": "家庭居留",
  "residenceStatus.无居留": "无居留",

  "jobStatus.draft": "草稿",
  "jobStatus.active": "招聘中",
  "jobStatus.paused": "已暂停",
  "jobStatus.filled": "已招满",
  "jobStatus.closed": "已关闭",

  "applicationStatus.submitted": "已投递",
  "applicationStatus.viewed": "已查看",
  "applicationStatus.contacted": "已联系",
  "applicationStatus.hired": "已录用",
  "applicationStatus.rejected": "未通过",
  "applicationStatus.withdrawn": "已撤回",

  "verificationStatus.unverified": "未认证",
  "verificationStatus.pending": "认证中",
  "verificationStatus.verified": "已认证",
  "verificationStatus.rejected": "认证未通过",

  "applications.title": "我的投递",
  "applications.empty": "还没有投递记录",

  "me.title": "我的",
  "me.roleSwitch": "切换到雇主端",
  "me.roleSwitchToSeeker": "切换到求职者端",

  "employer.dashboard.title": "工作台",
  "employer.post.title": "发布岗位",
  "employer.me.title": "我的",
};

const es: Dict = {
  "app.name": "DianPin",

  "nav.seeker.jobs": "Empleos",
  "nav.seeker.applications": "Postulaciones",
  "nav.seeker.me": "Mi cuenta",
  "nav.employer.dashboard": "Panel",
  "nav.employer.post": "Publicar",
  "nav.employer.me": "Mi cuenta",

  "common.language": "Español",
  "common.languageSwitch": "中文",
  "common.loading": "Cargando…",
  "common.comingSoon": "Próximamente",
  "common.back": "Volver",
  "common.reset": "Restablecer",
  "common.apply": "Aplicar",
  "common.all": "Todos",
  "common.yes": "Sí",
  "common.no": "No",
  "common.month": "mes",
  "common.perMonth": "€/mes",

  "home.title": "Buscar empleo",
  "home.citySwitch": "Cambiar ciudad",
  "home.resultsCount": "{count} empleos encontrados",
  "home.empty": "No hay empleos con estos filtros, intenta ajustarlos",
  "home.filters.jobType": "Tipo de trabajo",
  "home.filters.mealsIncluded": "Comida y alojamiento",
  "home.filters.residenceOk": "Sin residencia OK",
  "home.filters.salaryMin": "Salario mínimo (€/mes)",
  "home.filters.title": "Filtros",

  "job.salaryPeriod.hour": "hora",
  "job.salaryPeriod.day": "día",
  "job.salaryPeriod.month": "mes",
  "job.mealsIncluded": "Comida y alojamiento incluidos",
  "job.mealsNotIncluded": "Sin comida ni alojamiento",
  "job.liveIn": "Alojamiento disponible",
  "job.headcount": "{count} vacantes",
  "job.viewDetail": "Ver detalles",
  "job.views": "{count} vistas",

  "residenceRequired.none": "Residencia no requerida",
  "residenceRequired.prefer": "Se prefiere residencia",
  "residenceRequired.required": "Residencia obligatoria",

  "residenceStatus.有居留": "Con residencia legal",
  "residenceStatus.办理中": "En trámite",
  "residenceStatus.学生居留": "Residencia de estudiante",
  "residenceStatus.家庭居留": "Residencia familiar",
  "residenceStatus.无居留": "Sin residencia",

  "jobStatus.draft": "Borrador",
  "jobStatus.active": "Contratando",
  "jobStatus.paused": "Pausado",
  "jobStatus.filled": "Cubierto",
  "jobStatus.closed": "Cerrado",

  "applicationStatus.submitted": "Enviada",
  "applicationStatus.viewed": "Vista",
  "applicationStatus.contacted": "Contactado",
  "applicationStatus.hired": "Contratado",
  "applicationStatus.rejected": "No seleccionado",
  "applicationStatus.withdrawn": "Retirada",

  "verificationStatus.unverified": "Sin verificar",
  "verificationStatus.pending": "En verificación",
  "verificationStatus.verified": "Verificado",
  "verificationStatus.rejected": "Verificación rechazada",

  "applications.title": "Mis postulaciones",
  "applications.empty": "Aún no tienes postulaciones",

  "me.title": "Mi cuenta",
  "me.roleSwitch": "Cambiar a modo empleador",
  "me.roleSwitchToSeeker": "Cambiar a modo candidato",

  "employer.dashboard.title": "Panel de control",
  "employer.post.title": "Publicar empleo",
  "employer.me.title": "Mi cuenta",
};

const dictionaries: Record<Locale, Dict> = { zh, es };

export function t(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>
): string {
  const table = dictionaries[locale] ?? dictionaries[defaultLocale];
  let str = table[key] ?? dictionaries[defaultLocale][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.split(`{${k}}`).join(String(v));
    }
  }
  return str;
}
