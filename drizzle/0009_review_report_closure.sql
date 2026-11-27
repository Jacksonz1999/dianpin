-- One authentic application-backed review per seeker and store (AGENTS.md §5).
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_store_id_seeker_user_id_key" UNIQUE("store_id","seeker_user_id");
