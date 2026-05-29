--
-- PostgreSQL database dump
--

\restrict erqlNCVkcDkYrJURD2AFQY5vyUgOQnrUeaP4GEViPB32DXCgPBH57awoKJ5gDtJ

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP EVENT TRIGGER IF EXISTS pgrst_drop_watch;
DROP EVENT TRIGGER IF EXISTS pgrst_ddl_watch;
DROP EVENT TRIGGER IF EXISTS issue_pg_net_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_graphql_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_cron_access;
DROP EVENT TRIGGER IF EXISTS issue_graphql_placeholder;
DROP PUBLICATION IF EXISTS supabase_realtime;
ALTER TABLE IF EXISTS ONLY storage.vector_indexes DROP CONSTRAINT IF EXISTS vector_indexes_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_upload_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS "objects_bucketId_fkey";
ALTER TABLE IF EXISTS ONLY public.timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_slot_id_timetable_slots_id_fk;
ALTER TABLE IF EXISTS ONLY public.timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_semester_id_semesters_id_fk;
ALTER TABLE IF EXISTS ONLY public.timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_division_id_divisions_id_fk;
ALTER TABLE IF EXISTS ONLY public.timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_assignment_id_faculty_subject_assignments_id_;
ALTER TABLE IF EXISTS ONLY public.subjects DROP CONSTRAINT IF EXISTS subjects_course_id_courses_id_fk;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_current_division_id_divisions_id_fk;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_course_id_courses_id_fk;
ALTER TABLE IF EXISTS ONLY public.student_requests DROP CONSTRAINT IF EXISTS student_requests_target_faculty_id_faculty_id_fk;
ALTER TABLE IF EXISTS ONLY public.student_requests DROP CONSTRAINT IF EXISTS student_requests_student_id_students_id_fk;
ALTER TABLE IF EXISTS ONLY public.student_requests DROP CONSTRAINT IF EXISTS student_requests_semester_id_semesters_id_fk;
ALTER TABLE IF EXISTS ONLY public.student_prior_education DROP CONSTRAINT IF EXISTS student_prior_education_student_id_students_id_fk;
ALTER TABLE IF EXISTS ONLY public.student_documents DROP CONSTRAINT IF EXISTS student_documents_student_id_students_id_fk;
ALTER TABLE IF EXISTS ONLY public.semesters DROP CONSTRAINT IF EXISTS semesters_academic_year_id_academic_years_id_fk;
ALTER TABLE IF EXISTS ONLY public.student_enrollment_history DROP CONSTRAINT IF EXISTS seh_student_id_fk;
ALTER TABLE IF EXISTS ONLY public.student_enrollment_history DROP CONSTRAINT IF EXISTS seh_semester_id_fk;
ALTER TABLE IF EXISTS ONLY public.student_enrollment_history DROP CONSTRAINT IF EXISTS seh_division_id_fk;
ALTER TABLE IF EXISTS ONLY public.marks DROP CONSTRAINT IF EXISTS marks_student_id_students_id_fk;
ALTER TABLE IF EXISTS ONLY public.marks DROP CONSTRAINT IF EXISTS marks_semester_id_semesters_id_fk;
ALTER TABLE IF EXISTS ONLY public.marks DROP CONSTRAINT IF EXISTS marks_assignment_id_faculty_subject_assignments_id_fk;
ALTER TABLE IF EXISTS ONLY public.internal_exams DROP CONSTRAINT IF EXISTS internal_exams_target_division_id_divisions_id_fk;
ALTER TABLE IF EXISTS ONLY public.internal_exams DROP CONSTRAINT IF EXISTS internal_exams_semester_id_semesters_id_fk;
ALTER TABLE IF EXISTS ONLY public.internal_exams DROP CONSTRAINT IF EXISTS internal_exams_created_by_faculty_id_faculty_id_fk;
ALTER TABLE IF EXISTS ONLY public.internal_exam_marks DROP CONSTRAINT IF EXISTS internal_exam_marks_updated_by_faculty_id_faculty_id_fk;
ALTER TABLE IF EXISTS ONLY public.internal_exam_marks DROP CONSTRAINT IF EXISTS internal_exam_marks_student_id_students_id_fk;
ALTER TABLE IF EXISTS ONLY public.internal_exam_marks DROP CONSTRAINT IF EXISTS internal_exam_marks_internal_exam_id_internal_exams_id_fk;
ALTER TABLE IF EXISTS ONLY public.internal_exam_marks DROP CONSTRAINT IF EXISTS internal_exam_marks_assignment_id_faculty_subject_assignments_i;
ALTER TABLE IF EXISTS ONLY public.internal_evaluations DROP CONSTRAINT IF EXISTS internal_evaluations_updated_by_faculty_id_faculty_id_fk;
ALTER TABLE IF EXISTS ONLY public.internal_evaluations DROP CONSTRAINT IF EXISTS internal_evaluations_student_id_students_id_fk;
ALTER TABLE IF EXISTS ONLY public.internal_evaluations DROP CONSTRAINT IF EXISTS internal_evaluations_semester_id_semesters_id_fk;
ALTER TABLE IF EXISTS ONLY public.internal_evaluations DROP CONSTRAINT IF EXISTS internal_evaluations_finalized_by_faculty_id_faculty_id_fk;
ALTER TABLE IF EXISTS ONLY public.internal_evaluations DROP CONSTRAINT IF EXISTS internal_evaluations_assignment_id_faculty_subject_assignments_;
ALTER TABLE IF EXISTS ONLY public.faculty_subject_assignments DROP CONSTRAINT IF EXISTS faculty_subject_assignments_subject_id_subjects_id_fk;
ALTER TABLE IF EXISTS ONLY public.faculty_subject_assignments DROP CONSTRAINT IF EXISTS faculty_subject_assignments_semester_id_semesters_id_fk;
ALTER TABLE IF EXISTS ONLY public.faculty_subject_assignments DROP CONSTRAINT IF EXISTS faculty_subject_assignments_faculty_id_faculty_id_fk;
ALTER TABLE IF EXISTS ONLY public.faculty_subject_assignments DROP CONSTRAINT IF EXISTS faculty_subject_assignments_division_id_divisions_id_fk;
ALTER TABLE IF EXISTS ONLY public.faculty_roles DROP CONSTRAINT IF EXISTS faculty_roles_role_id_roles_id_fk;
ALTER TABLE IF EXISTS ONLY public.faculty_roles DROP CONSTRAINT IF EXISTS faculty_roles_faculty_id_faculty_id_fk;
ALTER TABLE IF EXISTS ONLY public.faculty_requests DROP CONSTRAINT IF EXISTS faculty_requests_request_type_code_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty_requests DROP CONSTRAINT IF EXISTS faculty_requests_faculty_id_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_proxies DROP CONSTRAINT IF EXISTS faculty_request_proxies_subject_id_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_proxies DROP CONSTRAINT IF EXISTS faculty_request_proxies_slot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_proxies DROP CONSTRAINT IF EXISTS faculty_request_proxies_sender_proxy_faculty_id_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_proxies DROP CONSTRAINT IF EXISTS faculty_request_proxies_request_id_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_proxies DROP CONSTRAINT IF EXISTS faculty_request_proxies_proxy_faculty_id_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_proxies DROP CONSTRAINT IF EXISTS faculty_request_proxies_overridden_by_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_proxies DROP CONSTRAINT IF EXISTS faculty_request_proxies_original_faculty_id_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_proxies DROP CONSTRAINT IF EXISTS faculty_request_proxies_division_id_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_documents DROP CONSTRAINT IF EXISTS faculty_request_documents_request_id_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_approvals DROP CONSTRAINT IF EXISTS faculty_request_approvals_request_id_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_approvals DROP CONSTRAINT IF EXISTS faculty_request_approvals_approver_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty DROP CONSTRAINT IF EXISTS faculty_course_id_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty_approval_configs DROP CONSTRAINT IF EXISTS faculty_approval_configs_request_type_code_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_subjects DROP CONSTRAINT IF EXISTS exam_subjects_subject_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_subjects DROP CONSTRAINT IF EXISTS exam_subjects_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_scopes DROP CONSTRAINT IF EXISTS exam_scopes_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_scopes DROP CONSTRAINT IF EXISTS exam_scopes_division_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_schedules DROP CONSTRAINT IF EXISTS exam_schedules_exam_subject_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_schedules DROP CONSTRAINT IF EXISTS exam_schedules_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_hall_allocations DROP CONSTRAINT IF EXISTS exam_hall_allocations_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_hall_allocations DROP CONSTRAINT IF EXISTS exam_hall_allocations_classroom_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_eligibility_rules DROP CONSTRAINT IF EXISTS exam_eligibility_rules_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.divisions DROP CONSTRAINT IF EXISTS divisions_semester_id_semesters_id_fk;
ALTER TABLE IF EXISTS ONLY public.divisions DROP CONSTRAINT IF EXISTS divisions_course_id_courses_id_fk;
ALTER TABLE IF EXISTS ONLY public.counselor_division_assignments DROP CONSTRAINT IF EXISTS counselor_division_assignments_semester_id_semesters_id_fk;
ALTER TABLE IF EXISTS ONLY public.counselor_division_assignments DROP CONSTRAINT IF EXISTS counselor_division_assignments_faculty_id_faculty_id_fk;
ALTER TABLE IF EXISTS ONLY public.counselor_division_assignments DROP CONSTRAINT IF EXISTS counselor_division_assignments_division_id_divisions_id_fk;
ALTER TABLE IF EXISTS ONLY public.classrooms DROP CONSTRAINT IF EXISTS classrooms_course_id_fkey;
ALTER TABLE IF EXISTS ONLY public.classroom_benches DROP CONSTRAINT IF EXISTS classroom_benches_classroom_id_fkey;
ALTER TABLE IF EXISTS ONLY public.circulars DROP CONSTRAINT IF EXISTS circulars_faculty_id_faculty_id_fk;
ALTER TABLE IF EXISTS ONLY public.circulars DROP CONSTRAINT IF EXISTS circulars_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.circular_recipients DROP CONSTRAINT IF EXISTS circular_recipients_division_id_fkey;
ALTER TABLE IF EXISTS ONLY public.circular_recipients DROP CONSTRAINT IF EXISTS circular_recipients_circular_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance_session_ledger DROP CONSTRAINT IF EXISTS attendance_session_ledger_subject_id_subjects_id_fk;
ALTER TABLE IF EXISTS ONLY public.attendance_session_ledger DROP CONSTRAINT IF EXISTS attendance_session_ledger_semester_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance_session_ledger DROP CONSTRAINT IF EXISTS attendance_session_ledger_faculty_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance_session_ledger DROP CONSTRAINT IF EXISTS attendance_session_ledger_division_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance_analytics_summary DROP CONSTRAINT IF EXISTS attendance_analytics_summary_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance_analytics_summary DROP CONSTRAINT IF EXISTS attendance_analytics_summary_semester_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance_analytics_summary DROP CONSTRAINT IF EXISTS attendance_analytics_summary_division_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.webauthn_credentials DROP CONSTRAINT IF EXISTS webauthn_credentials_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.webauthn_challenges DROP CONSTRAINT IF EXISTS webauthn_challenges_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_oauth_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_flow_state_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_auth_factor_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_user_id_fkey;
DROP TRIGGER IF EXISTS update_objects_updated_at ON storage.objects;
DROP TRIGGER IF EXISTS protect_objects_delete ON storage.objects;
DROP TRIGGER IF EXISTS protect_buckets_delete ON storage.buckets;
DROP TRIGGER IF EXISTS enforce_bucket_name_length_trigger ON storage.buckets;
DROP TRIGGER IF EXISTS tr_check_filters ON realtime.subscription;
DROP INDEX IF EXISTS storage.vector_indexes_name_bucket_id_idx;
DROP INDEX IF EXISTS storage.name_prefix_search;
DROP INDEX IF EXISTS storage.idx_objects_bucket_id_name_lower;
DROP INDEX IF EXISTS storage.idx_objects_bucket_id_name;
DROP INDEX IF EXISTS storage.idx_multipart_uploads_list;
DROP INDEX IF EXISTS storage.buckets_analytics_unique_name_idx;
DROP INDEX IF EXISTS storage.bucketid_objname;
DROP INDEX IF EXISTS storage.bname;
DROP INDEX IF EXISTS realtime.subscription_subscription_id_entity_filters_action_filter_key;
DROP INDEX IF EXISTS realtime.messages_inserted_at_topic_index;
DROP INDEX IF EXISTS realtime.ix_realtime_subscription_entity;
DROP INDEX IF EXISTS public.te_slot_idx;
DROP INDEX IF EXISTS public.te_div_day_start_sem_idx;
DROP INDEX IF EXISTS public.te_assign_sem_idx;
DROP INDEX IF EXISTS public.te_active_idx;
DROP INDEX IF EXISTS public.sr_targetfac_status_idx;
DROP INDEX IF EXISTS public.sr_student_sem_idx;
DROP INDEX IF EXISTS public.seh_student_status_idx;
DROP INDEX IF EXISTS public.seh_student_semester_idx;
DROP INDEX IF EXISTS public.seh_division_idx;
DROP INDEX IF EXISTS public.marks_student_assign_sem_idx;
DROP INDEX IF EXISTS public.marks_assign_sem_idx;
DROP INDEX IF EXISTS public.iev_assign_student_sem_idx;
DROP INDEX IF EXISTS public.iev_assign_sem_idx;
DROP INDEX IF EXISTS public.iem_student_idx;
DROP INDEX IF EXISTS public.iem_exam_assign_student_idx;
DROP INDEX IF EXISTS public.iem_assign_exam_idx;
DROP INDEX IF EXISTS public.ie_status_idx;
DROP INDEX IF EXISTS public.ie_sem_num_idx;
DROP INDEX IF EXISTS public.ie_sem_idx;
DROP INDEX IF EXISTS public.fsa_sem_fac_sub_div_idx;
DROP INDEX IF EXISTS public.esub_exam_sub_idx;
DROP INDEX IF EXISTS public.esub_exam_idx;
DROP INDEX IF EXISTS public.esch_exam_sub_idx;
DROP INDEX IF EXISTS public.esch_exam_idx;
DROP INDEX IF EXISTS public.esch_exam_date_idx;
DROP INDEX IF EXISTS public.es_exam_idx;
DROP INDEX IF EXISTS public.es_exam_div_idx;
DROP INDEX IF EXISTS public.eha_exam_room_idx;
DROP INDEX IF EXISTS public.eha_exam_idx;
DROP INDEX IF EXISTS public.eer_exam_year_idx;
DROP INDEX IF EXISTS public.eer_exam_idx;
DROP INDEX IF EXISTS public.divisions_batch_spec_idx;
DROP INDEX IF EXISTS public.divisions_batch_divno_idx;
DROP INDEX IF EXISTS public.classrooms_course_idx;
DROP INDEX IF EXISTS public.classrooms_active_idx;
DROP INDEX IF EXISTS public.circ_target_idx;
DROP INDEX IF EXISTS public.circ_faculty_idx;
DROP INDEX IF EXISTS public.circ_div_unique_idx;
DROP INDEX IF EXISTS public.circ_div_div_idx;
DROP INDEX IF EXISTS public.circ_div_circ_idx;
DROP INDEX IF EXISTS public.circ_created_idx;
DROP INDEX IF EXISTS public.cda_sem_fac_div_idx;
DROP INDEX IF EXISTS public.cb_classroom_idx;
DROP INDEX IF EXISTS public.cb_classroom_grid_idx;
DROP INDEX IF EXISTS public.asl_div_date_idx;
DROP INDEX IF EXISTS public.asl_absent_ids_gin_idx;
DROP INDEX IF EXISTS public.al_user_time_idx;
DROP INDEX IF EXISTS public.al_time_idx;
DROP INDEX IF EXISTS public.al_module_entity_idx;
DROP INDEX IF EXISTS public.aas_div_pct_idx;
DROP INDEX IF EXISTS auth.webauthn_credentials_user_id_idx;
DROP INDEX IF EXISTS auth.webauthn_credentials_credential_id_key;
DROP INDEX IF EXISTS auth.webauthn_challenges_user_id_idx;
DROP INDEX IF EXISTS auth.webauthn_challenges_expires_at_idx;
DROP INDEX IF EXISTS auth.users_is_anonymous_idx;
DROP INDEX IF EXISTS auth.users_instance_id_idx;
DROP INDEX IF EXISTS auth.users_instance_id_email_idx;
DROP INDEX IF EXISTS auth.users_email_partial_key;
DROP INDEX IF EXISTS auth.user_id_created_at_idx;
DROP INDEX IF EXISTS auth.unique_phone_factor_per_user;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_pattern_idx;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_domain_idx;
DROP INDEX IF EXISTS auth.sessions_user_id_idx;
DROP INDEX IF EXISTS auth.sessions_oauth_client_id_idx;
DROP INDEX IF EXISTS auth.sessions_not_after_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_for_email_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_created_at_idx;
DROP INDEX IF EXISTS auth.saml_providers_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_updated_at_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_session_id_revoked_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_parent_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_user_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_idx;
DROP INDEX IF EXISTS auth.recovery_token_idx;
DROP INDEX IF EXISTS auth.reauthentication_token_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_user_id_token_type_key;
DROP INDEX IF EXISTS auth.one_time_tokens_token_hash_hash_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_relates_to_hash_idx;
DROP INDEX IF EXISTS auth.oauth_consents_user_order_idx;
DROP INDEX IF EXISTS auth.oauth_consents_active_user_client_idx;
DROP INDEX IF EXISTS auth.oauth_consents_active_client_idx;
DROP INDEX IF EXISTS auth.oauth_clients_deleted_at_idx;
DROP INDEX IF EXISTS auth.oauth_auth_pending_exp_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_id_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_friendly_name_unique;
DROP INDEX IF EXISTS auth.mfa_challenge_created_at_idx;
DROP INDEX IF EXISTS auth.idx_users_name;
DROP INDEX IF EXISTS auth.idx_users_last_sign_in_at_desc;
DROP INDEX IF EXISTS auth.idx_users_email;
DROP INDEX IF EXISTS auth.idx_users_created_at_desc;
DROP INDEX IF EXISTS auth.idx_user_id_auth_method;
DROP INDEX IF EXISTS auth.idx_oauth_client_states_created_at;
DROP INDEX IF EXISTS auth.idx_auth_code;
DROP INDEX IF EXISTS auth.identities_user_id_idx;
DROP INDEX IF EXISTS auth.identities_email_idx;
DROP INDEX IF EXISTS auth.flow_state_created_at_idx;
DROP INDEX IF EXISTS auth.factor_id_created_at_idx;
DROP INDEX IF EXISTS auth.email_change_token_new_idx;
DROP INDEX IF EXISTS auth.email_change_token_current_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_provider_type_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_identifier_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_enabled_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_created_at_idx;
DROP INDEX IF EXISTS auth.confirmation_token_idx;
DROP INDEX IF EXISTS auth.audit_logs_instance_id_idx;
ALTER TABLE IF EXISTS ONLY storage.vector_indexes DROP CONSTRAINT IF EXISTS vector_indexes_pkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_pkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_pkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS objects_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_name_key;
ALTER TABLE IF EXISTS ONLY storage.buckets_vectors DROP CONSTRAINT IF EXISTS buckets_vectors_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets DROP CONSTRAINT IF EXISTS buckets_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets_analytics DROP CONSTRAINT IF EXISTS buckets_analytics_pkey;
ALTER TABLE IF EXISTS ONLY realtime.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY realtime.subscription DROP CONSTRAINT IF EXISTS pk_subscription;
ALTER TABLE IF EXISTS ONLY realtime.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.timetable_slots DROP CONSTRAINT IF EXISTS timetable_slots_slot_number_unique;
ALTER TABLE IF EXISTS ONLY public.timetable_slots DROP CONSTRAINT IF EXISTS timetable_slots_pkey;
ALTER TABLE IF EXISTS ONLY public.timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_pkey;
ALTER TABLE IF EXISTS ONLY public.subjects DROP CONSTRAINT IF EXISTS subjects_pkey;
ALTER TABLE IF EXISTS ONLY public.subjects DROP CONSTRAINT IF EXISTS subjects_code_unique;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_temp_id_unique;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_student_id_unique;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_spid_unique;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_pkey;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_mobile_unique;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_enrollment_id_unique;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_email_unique;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_abc_id_unique;
ALTER TABLE IF EXISTS ONLY public.student_requests DROP CONSTRAINT IF EXISTS student_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.student_prior_education DROP CONSTRAINT IF EXISTS student_prior_education_student_id_unique;
ALTER TABLE IF EXISTS ONLY public.student_prior_education DROP CONSTRAINT IF EXISTS student_prior_education_pkey;
ALTER TABLE IF EXISTS ONLY public.student_enrollment_history DROP CONSTRAINT IF EXISTS student_enrollment_history_pkey;
ALTER TABLE IF EXISTS ONLY public.student_documents DROP CONSTRAINT IF EXISTS student_documents_pkey;
ALTER TABLE IF EXISTS ONLY public.semesters DROP CONSTRAINT IF EXISTS semesters_pkey;
ALTER TABLE IF EXISTS ONLY public.rooms DROP CONSTRAINT IF EXISTS rooms_pkey;
ALTER TABLE IF EXISTS ONLY public.rooms DROP CONSTRAINT IF EXISTS rooms_code_unique;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_name_unique;
ALTER TABLE IF EXISTS ONLY public.marks DROP CONSTRAINT IF EXISTS marks_pkey;
ALTER TABLE IF EXISTS ONLY public.internal_exams DROP CONSTRAINT IF EXISTS internal_exams_pkey;
ALTER TABLE IF EXISTS ONLY public.internal_exam_marks DROP CONSTRAINT IF EXISTS internal_exam_marks_pkey;
ALTER TABLE IF EXISTS ONLY public.internal_evaluations DROP CONSTRAINT IF EXISTS internal_evaluations_pkey;
ALTER TABLE IF EXISTS ONLY public.faculty_subject_assignments DROP CONSTRAINT IF EXISTS faculty_subject_assignments_pkey;
ALTER TABLE IF EXISTS ONLY public.faculty_roles DROP CONSTRAINT IF EXISTS faculty_roles_faculty_id_role_id_pk;
ALTER TABLE IF EXISTS ONLY public.faculty_requests DROP CONSTRAINT IF EXISTS faculty_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_types DROP CONSTRAINT IF EXISTS faculty_request_types_pkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_types DROP CONSTRAINT IF EXISTS faculty_request_types_code_key;
ALTER TABLE IF EXISTS ONLY public.faculty_request_proxies DROP CONSTRAINT IF EXISTS faculty_request_proxies_pkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_documents DROP CONSTRAINT IF EXISTS faculty_request_documents_pkey;
ALTER TABLE IF EXISTS ONLY public.faculty_request_approvals DROP CONSTRAINT IF EXISTS faculty_request_approvals_pkey;
ALTER TABLE IF EXISTS ONLY public.faculty DROP CONSTRAINT IF EXISTS faculty_pkey;
ALTER TABLE IF EXISTS ONLY public.faculty DROP CONSTRAINT IF EXISTS faculty_faculty_code_unique;
ALTER TABLE IF EXISTS ONLY public.faculty DROP CONSTRAINT IF EXISTS faculty_email_unique;
ALTER TABLE IF EXISTS ONLY public.faculty_approval_configs DROP CONSTRAINT IF EXISTS faculty_approval_configs_request_type_code_key;
ALTER TABLE IF EXISTS ONLY public.faculty_approval_configs DROP CONSTRAINT IF EXISTS faculty_approval_configs_pkey;
ALTER TABLE IF EXISTS ONLY public.exam_subjects DROP CONSTRAINT IF EXISTS exam_subjects_pkey;
ALTER TABLE IF EXISTS ONLY public.exam_scopes DROP CONSTRAINT IF EXISTS exam_scopes_pkey;
ALTER TABLE IF EXISTS ONLY public.exam_schedules DROP CONSTRAINT IF EXISTS exam_schedules_pkey;
ALTER TABLE IF EXISTS ONLY public.exam_hall_allocations DROP CONSTRAINT IF EXISTS exam_hall_allocations_pkey;
ALTER TABLE IF EXISTS ONLY public.exam_eligibility_rules DROP CONSTRAINT IF EXISTS exam_eligibility_rules_pkey;
ALTER TABLE IF EXISTS ONLY public.divisions DROP CONSTRAINT IF EXISTS divisions_pkey;
ALTER TABLE IF EXISTS ONLY public.courses DROP CONSTRAINT IF EXISTS courses_pkey;
ALTER TABLE IF EXISTS ONLY public.courses DROP CONSTRAINT IF EXISTS courses_code_unique;
ALTER TABLE IF EXISTS ONLY public.counselor_division_assignments DROP CONSTRAINT IF EXISTS counselor_division_assignments_pkey;
ALTER TABLE IF EXISTS ONLY public.classrooms DROP CONSTRAINT IF EXISTS classrooms_room_code_key;
ALTER TABLE IF EXISTS ONLY public.classrooms DROP CONSTRAINT IF EXISTS classrooms_pkey;
ALTER TABLE IF EXISTS ONLY public.classroom_benches DROP CONSTRAINT IF EXISTS classroom_benches_pkey;
ALTER TABLE IF EXISTS ONLY public.circulars DROP CONSTRAINT IF EXISTS circulars_slug_unique;
ALTER TABLE IF EXISTS ONLY public.circulars DROP CONSTRAINT IF EXISTS circulars_pkey;
ALTER TABLE IF EXISTS ONLY public.circular_recipients DROP CONSTRAINT IF EXISTS circular_recipients_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.attendance_session_ledger DROP CONSTRAINT IF EXISTS attendance_session_ledger_pkey;
ALTER TABLE IF EXISTS ONLY public.attendance_analytics_summary DROP CONSTRAINT IF EXISTS attendance_analytics_summary_pkey;
ALTER TABLE IF EXISTS ONLY public.administrators DROP CONSTRAINT IF EXISTS administrators_pkey;
ALTER TABLE IF EXISTS ONLY public.administrators DROP CONSTRAINT IF EXISTS administrators_email_key;
ALTER TABLE IF EXISTS ONLY public.administrators DROP CONSTRAINT IF EXISTS administrators_admin_code_key;
ALTER TABLE IF EXISTS ONLY public.academic_years DROP CONSTRAINT IF EXISTS academic_years_pkey;
ALTER TABLE IF EXISTS ONLY public.academic_years DROP CONSTRAINT IF EXISTS academic_years_name_unique;
ALTER TABLE IF EXISTS ONLY drizzle.__drizzle_migrations DROP CONSTRAINT IF EXISTS __drizzle_migrations_pkey;
ALTER TABLE IF EXISTS ONLY auth.webauthn_credentials DROP CONSTRAINT IF EXISTS webauthn_credentials_pkey;
ALTER TABLE IF EXISTS ONLY auth.webauthn_challenges DROP CONSTRAINT IF EXISTS webauthn_challenges_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_phone_key;
ALTER TABLE IF EXISTS ONLY auth.sso_providers DROP CONSTRAINT IF EXISTS sso_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_pkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY auth.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_entity_id_key;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_token_unique;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_user_client_unique;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_clients DROP CONSTRAINT IF EXISTS oauth_clients_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_client_states DROP CONSTRAINT IF EXISTS oauth_client_states_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_authorization_id_key;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_authorization_code_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_last_challenged_at_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_authentication_method_pkey;
ALTER TABLE IF EXISTS ONLY auth.instances DROP CONSTRAINT IF EXISTS instances_pkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_provider_id_provider_unique;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_pkey;
ALTER TABLE IF EXISTS ONLY auth.flow_state DROP CONSTRAINT IF EXISTS flow_state_pkey;
ALTER TABLE IF EXISTS ONLY auth.custom_oauth_providers DROP CONSTRAINT IF EXISTS custom_oauth_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.custom_oauth_providers DROP CONSTRAINT IF EXISTS custom_oauth_providers_identifier_key;
ALTER TABLE IF EXISTS ONLY auth.audit_log_entries DROP CONSTRAINT IF EXISTS audit_log_entries_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS amr_id_pk;
ALTER TABLE IF EXISTS public.timetable_slots ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.timetable_entries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.subjects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.students ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.student_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.student_prior_education ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.student_enrollment_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.student_documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.semesters ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.rooms ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.marks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.internal_exams ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.internal_exam_marks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.internal_evaluations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.faculty_subject_assignments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.faculty_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.faculty_request_types ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.faculty_request_proxies ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.faculty_request_documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.faculty_request_approvals ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.faculty_approval_configs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.faculty ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.exam_subjects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.exam_scopes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.exam_schedules ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.exam_hall_allocations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.exam_eligibility_rules ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.divisions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.courses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.counselor_division_assignments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.classrooms ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.classroom_benches ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.circulars ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.circular_recipients ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.attendance_session_ledger ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.administrators ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.academic_years ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS drizzle.__drizzle_migrations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS auth.refresh_tokens ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS storage.vector_indexes;
DROP TABLE IF EXISTS storage.s3_multipart_uploads_parts;
DROP TABLE IF EXISTS storage.s3_multipart_uploads;
DROP TABLE IF EXISTS storage.objects;
DROP TABLE IF EXISTS storage.migrations;
DROP TABLE IF EXISTS storage.buckets_vectors;
DROP TABLE IF EXISTS storage.buckets_analytics;
DROP TABLE IF EXISTS storage.buckets;
DROP TABLE IF EXISTS realtime.subscription;
DROP TABLE IF EXISTS realtime.schema_migrations;
DROP TABLE IF EXISTS realtime.messages;
DROP SEQUENCE IF EXISTS public.timetable_slots_id_seq;
DROP TABLE IF EXISTS public.timetable_slots;
DROP SEQUENCE IF EXISTS public.timetable_entries_id_seq;
DROP TABLE IF EXISTS public.timetable_entries;
DROP SEQUENCE IF EXISTS public.subjects_id_seq;
DROP TABLE IF EXISTS public.subjects;
DROP SEQUENCE IF EXISTS public.students_id_seq;
DROP TABLE IF EXISTS public.students;
DROP SEQUENCE IF EXISTS public.student_requests_id_seq;
DROP TABLE IF EXISTS public.student_requests;
DROP SEQUENCE IF EXISTS public.student_prior_education_id_seq;
DROP TABLE IF EXISTS public.student_prior_education;
DROP SEQUENCE IF EXISTS public.student_enrollment_history_id_seq;
DROP TABLE IF EXISTS public.student_enrollment_history;
DROP SEQUENCE IF EXISTS public.student_documents_id_seq;
DROP TABLE IF EXISTS public.student_documents;
DROP SEQUENCE IF EXISTS public.semesters_id_seq;
DROP TABLE IF EXISTS public.semesters;
DROP SEQUENCE IF EXISTS public.rooms_id_seq;
DROP TABLE IF EXISTS public.rooms;
DROP SEQUENCE IF EXISTS public.roles_id_seq;
DROP TABLE IF EXISTS public.roles;
DROP SEQUENCE IF EXISTS public.marks_id_seq;
DROP TABLE IF EXISTS public.marks;
DROP SEQUENCE IF EXISTS public.internal_exams_id_seq;
DROP TABLE IF EXISTS public.internal_exams;
DROP SEQUENCE IF EXISTS public.internal_exam_marks_id_seq;
DROP TABLE IF EXISTS public.internal_exam_marks;
DROP SEQUENCE IF EXISTS public.internal_evaluations_id_seq;
DROP TABLE IF EXISTS public.internal_evaluations;
DROP SEQUENCE IF EXISTS public.faculty_subject_assignments_id_seq;
DROP TABLE IF EXISTS public.faculty_subject_assignments;
DROP TABLE IF EXISTS public.faculty_roles;
DROP SEQUENCE IF EXISTS public.faculty_requests_id_seq;
DROP TABLE IF EXISTS public.faculty_requests;
DROP SEQUENCE IF EXISTS public.faculty_request_types_id_seq;
DROP TABLE IF EXISTS public.faculty_request_types;
DROP SEQUENCE IF EXISTS public.faculty_request_proxies_id_seq;
DROP TABLE IF EXISTS public.faculty_request_proxies;
DROP SEQUENCE IF EXISTS public.faculty_request_documents_id_seq;
DROP TABLE IF EXISTS public.faculty_request_documents;
DROP SEQUENCE IF EXISTS public.faculty_request_approvals_id_seq;
DROP TABLE IF EXISTS public.faculty_request_approvals;
DROP SEQUENCE IF EXISTS public.faculty_id_seq;
DROP SEQUENCE IF EXISTS public.faculty_approval_configs_id_seq;
DROP TABLE IF EXISTS public.faculty_approval_configs;
DROP TABLE IF EXISTS public.faculty;
DROP SEQUENCE IF EXISTS public.exam_subjects_id_seq;
DROP TABLE IF EXISTS public.exam_subjects;
DROP SEQUENCE IF EXISTS public.exam_scopes_id_seq;
DROP TABLE IF EXISTS public.exam_scopes;
DROP SEQUENCE IF EXISTS public.exam_schedules_id_seq;
DROP TABLE IF EXISTS public.exam_schedules;
DROP SEQUENCE IF EXISTS public.exam_hall_allocations_id_seq;
DROP TABLE IF EXISTS public.exam_hall_allocations;
DROP SEQUENCE IF EXISTS public.exam_eligibility_rules_id_seq;
DROP TABLE IF EXISTS public.exam_eligibility_rules;
DROP SEQUENCE IF EXISTS public.divisions_id_seq;
DROP TABLE IF EXISTS public.divisions;
DROP SEQUENCE IF EXISTS public.courses_id_seq;
DROP TABLE IF EXISTS public.courses;
DROP SEQUENCE IF EXISTS public.counselor_division_assignments_id_seq;
DROP TABLE IF EXISTS public.counselor_division_assignments;
DROP SEQUENCE IF EXISTS public.classrooms_id_seq;
DROP TABLE IF EXISTS public.classrooms;
DROP SEQUENCE IF EXISTS public.classroom_benches_id_seq;
DROP TABLE IF EXISTS public.classroom_benches;
DROP SEQUENCE IF EXISTS public.circulars_id_seq;
DROP TABLE IF EXISTS public.circulars;
DROP SEQUENCE IF EXISTS public.circular_recipients_id_seq;
DROP TABLE IF EXISTS public.circular_recipients;
DROP SEQUENCE IF EXISTS public.audit_logs_id_seq;
DROP TABLE IF EXISTS public.audit_logs;
DROP SEQUENCE IF EXISTS public.attendance_session_ledger_id_seq;
DROP TABLE IF EXISTS public.attendance_session_ledger;
DROP TABLE IF EXISTS public.attendance_analytics_summary;
DROP SEQUENCE IF EXISTS public.administrators_id_seq;
DROP TABLE IF EXISTS public.administrators;
DROP SEQUENCE IF EXISTS public.academic_years_id_seq;
DROP TABLE IF EXISTS public.academic_years;
DROP SEQUENCE IF EXISTS drizzle.__drizzle_migrations_id_seq;
DROP TABLE IF EXISTS drizzle.__drizzle_migrations;
DROP TABLE IF EXISTS auth.webauthn_credentials;
DROP TABLE IF EXISTS auth.webauthn_challenges;
DROP TABLE IF EXISTS auth.users;
DROP TABLE IF EXISTS auth.sso_providers;
DROP TABLE IF EXISTS auth.sso_domains;
DROP TABLE IF EXISTS auth.sessions;
DROP TABLE IF EXISTS auth.schema_migrations;
DROP TABLE IF EXISTS auth.saml_relay_states;
DROP TABLE IF EXISTS auth.saml_providers;
DROP SEQUENCE IF EXISTS auth.refresh_tokens_id_seq;
DROP TABLE IF EXISTS auth.refresh_tokens;
DROP TABLE IF EXISTS auth.one_time_tokens;
DROP TABLE IF EXISTS auth.oauth_consents;
DROP TABLE IF EXISTS auth.oauth_clients;
DROP TABLE IF EXISTS auth.oauth_client_states;
DROP TABLE IF EXISTS auth.oauth_authorizations;
DROP TABLE IF EXISTS auth.mfa_factors;
DROP TABLE IF EXISTS auth.mfa_challenges;
DROP TABLE IF EXISTS auth.mfa_amr_claims;
DROP TABLE IF EXISTS auth.instances;
DROP TABLE IF EXISTS auth.identities;
DROP TABLE IF EXISTS auth.flow_state;
DROP TABLE IF EXISTS auth.custom_oauth_providers;
DROP TABLE IF EXISTS auth.audit_log_entries;
DROP FUNCTION IF EXISTS storage.update_updated_at_column();
DROP FUNCTION IF EXISTS storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text);
DROP FUNCTION IF EXISTS storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text);
DROP FUNCTION IF EXISTS storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text);
DROP FUNCTION IF EXISTS storage.protect_delete();
DROP FUNCTION IF EXISTS storage.operation();
DROP FUNCTION IF EXISTS storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text);
DROP FUNCTION IF EXISTS storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text);
DROP FUNCTION IF EXISTS storage.get_size_by_bucket();
DROP FUNCTION IF EXISTS storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text);
DROP FUNCTION IF EXISTS storage.foldername(name text);
DROP FUNCTION IF EXISTS storage.filename(name text);
DROP FUNCTION IF EXISTS storage.extension(name text);
DROP FUNCTION IF EXISTS storage.enforce_bucket_name_length();
DROP FUNCTION IF EXISTS storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb);
DROP FUNCTION IF EXISTS storage.allow_only_operation(expected_operation text);
DROP FUNCTION IF EXISTS storage.allow_any_operation(expected_operations text[]);
DROP FUNCTION IF EXISTS realtime.topic();
DROP FUNCTION IF EXISTS realtime.to_regrole(role_name text);
DROP FUNCTION IF EXISTS realtime.subscription_check_filters();
DROP FUNCTION IF EXISTS realtime.send(payload jsonb, event text, topic text, private boolean);
DROP FUNCTION IF EXISTS realtime.quote_wal2json(entity regclass);
DROP FUNCTION IF EXISTS realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer);
DROP FUNCTION IF EXISTS realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]);
DROP FUNCTION IF EXISTS realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text);
DROP FUNCTION IF EXISTS realtime."cast"(val text, type_ regtype);
DROP FUNCTION IF EXISTS realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]);
DROP FUNCTION IF EXISTS realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text);
DROP FUNCTION IF EXISTS realtime.apply_rls(wal jsonb, max_record_bytes integer);
DROP FUNCTION IF EXISTS pgbouncer.get_auth(p_usename text);
DROP FUNCTION IF EXISTS graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb);
DROP FUNCTION IF EXISTS extensions.set_graphql_placeholder();
DROP FUNCTION IF EXISTS extensions.pgrst_drop_watch();
DROP FUNCTION IF EXISTS extensions.pgrst_ddl_watch();
DROP FUNCTION IF EXISTS extensions.grant_pg_net_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_graphql_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_cron_access();
DROP FUNCTION IF EXISTS auth.uid();
DROP FUNCTION IF EXISTS auth.role();
DROP FUNCTION IF EXISTS auth.jwt();
DROP FUNCTION IF EXISTS auth.email();
DROP TYPE IF EXISTS storage.buckettype;
DROP TYPE IF EXISTS realtime.wal_rls;
DROP TYPE IF EXISTS realtime.wal_column;
DROP TYPE IF EXISTS realtime.user_defined_filter;
DROP TYPE IF EXISTS realtime.equality_op;
DROP TYPE IF EXISTS realtime.action;
DROP TYPE IF EXISTS auth.one_time_token_type;
DROP TYPE IF EXISTS auth.oauth_response_type;
DROP TYPE IF EXISTS auth.oauth_registration_type;
DROP TYPE IF EXISTS auth.oauth_client_type;
DROP TYPE IF EXISTS auth.oauth_authorization_status;
DROP TYPE IF EXISTS auth.factor_type;
DROP TYPE IF EXISTS auth.factor_status;
DROP TYPE IF EXISTS auth.code_challenge_method;
DROP TYPE IF EXISTS auth.aal_level;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS supabase_vault;
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS pg_stat_statements;
DROP SCHEMA IF EXISTS vault;
DROP SCHEMA IF EXISTS storage;
DROP SCHEMA IF EXISTS realtime;
DROP SCHEMA IF EXISTS pgbouncer;
DROP SCHEMA IF EXISTS graphql_public;
DROP SCHEMA IF EXISTS graphql;
DROP SCHEMA IF EXISTS extensions;
DROP SCHEMA IF EXISTS drizzle;
DROP SCHEMA IF EXISTS auth;
--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO postgres;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
begin
    if not exists (
        select 1
        from pg_event_trigger_ddl_commands() ev
        join pg_catalog.pg_extension e on ev.objid = e.oid
        where e.extname = 'pg_graphql'
    ) then
        return;
    end if;

    drop function if exists graphql_public.graphql;
    create or replace function graphql_public.graphql(
        "operationName" text default null,
        query text default null,
        variables jsonb default null,
        extensions jsonb default null
    )
        returns jsonb
        language sql
    as $$
        select graphql.resolve(
            query := query,
            variables := coalesce(variables, '{}'),
            "operationName" := "operationName",
            extensions := extensions
        );
    $$;

    -- Attach the wrapper to the extension so DROP EXTENSION cascades to it,
    -- which in turn triggers set_graphql_placeholder to reinstall the "not enabled" stub.
    alter extension pg_graphql add function graphql_public.graphql(text, text, jsonb, jsonb);

    grant usage on schema graphql to postgres, anon, authenticated, service_role;
    grant execute on function graphql.resolve to postgres, anon, authenticated, service_role;
    grant usage on schema graphql to postgres with grant option;
    grant usage on schema graphql_public to postgres with grant option;
end;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: supabase_admin
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


ALTER FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) OWNER TO supabase_admin;

--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL AND ppt.tablename NOT LIKE '% %'),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  -- Count raw slot entries before apply_rls/subscription filter
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  -- Apply RLS and filter as before
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  -- Real rows with slot count attached
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  -- Sentinel row: always returned when no real rows exist so Elixir can
  -- always read slot_changes_count. Identified by wal IS NULL.
  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


ALTER FUNCTION storage.allow_any_operation(expected_operations text[]) OWNER TO supabase_storage_admin;

--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


ALTER FUNCTION storage.allow_only_operation(expected_operation text) OWNER TO supabase_storage_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text) OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.protect_delete() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


ALTER TABLE auth.custom_oauth_providers OWNER TO supabase_auth_admin;

--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE auth.oauth_client_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


ALTER TABLE auth.webauthn_challenges OWNER TO supabase_auth_admin;

--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


ALTER TABLE auth.webauthn_credentials OWNER TO supabase_auth_admin;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: postgres
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: postgres
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: postgres
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: academic_years; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.academic_years (
    id integer NOT NULL,
    name character varying(20) NOT NULL,
    start_year integer NOT NULL,
    end_year integer NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.academic_years OWNER TO postgres;

--
-- Name: academic_years_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.academic_years_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.academic_years_id_seq OWNER TO postgres;

--
-- Name: academic_years_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.academic_years_id_seq OWNED BY public.academic_years.id;


--
-- Name: administrators; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.administrators (
    id integer NOT NULL,
    admin_code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    mobile character varying(15) NOT NULL,
    password_hash character varying(255) NOT NULL,
    must_change_pwd boolean DEFAULT true NOT NULL,
    designation character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    gender character varying(10),
    dob date,
    address jsonb,
    alternate_mobile character varying(15),
    profile_photo_url character varying(255),
    qualification character varying(100),
    experience_years integer,
    specialization character varying(150),
    profile_completion character varying(20) DEFAULT 'incomplete'::character varying NOT NULL,
    profile_step integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.administrators OWNER TO postgres;

--
-- Name: administrators_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.administrators_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.administrators_id_seq OWNER TO postgres;

--
-- Name: administrators_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.administrators_id_seq OWNED BY public.administrators.id;


--
-- Name: attendance_analytics_summary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_analytics_summary (
    student_id integer NOT NULL,
    division_id integer NOT NULL,
    semester_id integer NOT NULL,
    present_count integer DEFAULT 0 NOT NULL,
    total_lectures integer DEFAULT 0 NOT NULL,
    attendance_percentage numeric(5,2) DEFAULT 0.00 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.attendance_analytics_summary OWNER TO postgres;

--
-- Name: attendance_session_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_session_ledger (
    id integer NOT NULL,
    semester_id integer NOT NULL,
    division_id integer NOT NULL,
    faculty_id integer NOT NULL,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    absent_student_ids integer[] NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    subject_id integer NOT NULL
);


ALTER TABLE public.attendance_session_ledger OWNER TO postgres;

--
-- Name: attendance_session_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_session_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_session_ledger_id_seq OWNER TO postgres;

--
-- Name: attendance_session_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_session_ledger_id_seq OWNED BY public.attendance_session_ledger.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    user_type character varying(20) NOT NULL,
    user_name character varying(150) NOT NULL,
    action character varying(50) NOT NULL,
    module character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    description text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: circular_recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.circular_recipients (
    id integer NOT NULL,
    circular_id integer NOT NULL,
    division_id integer NOT NULL
);


ALTER TABLE public.circular_recipients OWNER TO postgres;

--
-- Name: circular_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.circular_recipients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.circular_recipients_id_seq OWNER TO postgres;

--
-- Name: circular_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.circular_recipients_id_seq OWNED BY public.circular_recipients.id;


--
-- Name: circulars; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.circulars (
    id integer NOT NULL,
    slug character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    attachment_url character varying(500),
    attachment_type character varying(50),
    attachment_size integer,
    target_type character varying(20) DEFAULT 'ALL'::character varying NOT NULL,
    target_year integer,
    faculty_id integer,
    faculty_name character varying(150) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    admin_id integer
);


ALTER TABLE public.circulars OWNER TO postgres;

--
-- Name: circulars_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.circulars_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.circulars_id_seq OWNER TO postgres;

--
-- Name: circulars_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.circulars_id_seq OWNED BY public.circulars.id;


--
-- Name: classroom_benches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classroom_benches (
    id integer NOT NULL,
    classroom_id integer NOT NULL,
    label character varying(10) NOT NULL,
    grid_x integer NOT NULL,
    grid_y integer NOT NULL,
    max_students integer DEFAULT 2 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text
);


ALTER TABLE public.classroom_benches OWNER TO postgres;

--
-- Name: classroom_benches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.classroom_benches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.classroom_benches_id_seq OWNER TO postgres;

--
-- Name: classroom_benches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.classroom_benches_id_seq OWNED BY public.classroom_benches.id;


--
-- Name: classrooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classrooms (
    id integer NOT NULL,
    room_code character varying(50) NOT NULL,
    building_name character varying(150),
    floor character varying(50) NOT NULL,
    lecture_capacity integer NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    course_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.classrooms OWNER TO postgres;

--
-- Name: classrooms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.classrooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.classrooms_id_seq OWNER TO postgres;

--
-- Name: classrooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.classrooms_id_seq OWNED BY public.classrooms.id;


--
-- Name: counselor_division_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.counselor_division_assignments (
    id integer NOT NULL,
    semester_id integer NOT NULL,
    faculty_id integer NOT NULL,
    division_id integer NOT NULL
);


ALTER TABLE public.counselor_division_assignments OWNER TO postgres;

--
-- Name: counselor_division_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.counselor_division_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.counselor_division_assignments_id_seq OWNER TO postgres;

--
-- Name: counselor_division_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.counselor_division_assignments_id_seq OWNED BY public.counselor_division_assignments.id;


--
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courses (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    total_sems integer DEFAULT 6 NOT NULL
);


ALTER TABLE public.courses OWNER TO postgres;

--
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.courses_id_seq OWNER TO postgres;

--
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- Name: divisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.divisions (
    id integer NOT NULL,
    semester_id integer NOT NULL,
    course_id integer NOT NULL,
    course_code character varying(20) NOT NULL,
    course_name character varying(100) NOT NULL,
    semester_no integer NOT NULL,
    division_no integer NOT NULL,
    display_name character varying(50) NOT NULL,
    max_capacity integer DEFAULT 60 NOT NULL,
    specialization character varying(20) NOT NULL,
    batch_year integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    publish_status character varying(20) DEFAULT 'draft'::character varying NOT NULL
);


ALTER TABLE public.divisions OWNER TO postgres;

--
-- Name: divisions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.divisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.divisions_id_seq OWNER TO postgres;

--
-- Name: divisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.divisions_id_seq OWNED BY public.divisions.id;


--
-- Name: exam_eligibility_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_eligibility_rules (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    year_label integer NOT NULL,
    min_attendance_percent integer DEFAULT 75 NOT NULL,
    allow_approval_override boolean DEFAULT false NOT NULL,
    approval_deadline date
);


ALTER TABLE public.exam_eligibility_rules OWNER TO postgres;

--
-- Name: exam_eligibility_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exam_eligibility_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_eligibility_rules_id_seq OWNER TO postgres;

--
-- Name: exam_eligibility_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_eligibility_rules_id_seq OWNED BY public.exam_eligibility_rules.id;


--
-- Name: exam_hall_allocations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_hall_allocations (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    classroom_id integer NOT NULL,
    sequence_order integer NOT NULL
);


ALTER TABLE public.exam_hall_allocations OWNER TO postgres;

--
-- Name: exam_hall_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exam_hall_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_hall_allocations_id_seq OWNER TO postgres;

--
-- Name: exam_hall_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_hall_allocations_id_seq OWNED BY public.exam_hall_allocations.id;


--
-- Name: exam_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_schedules (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    exam_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    exam_subject_id integer NOT NULL
);


ALTER TABLE public.exam_schedules OWNER TO postgres;

--
-- Name: exam_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exam_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_schedules_id_seq OWNER TO postgres;

--
-- Name: exam_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_schedules_id_seq OWNED BY public.exam_schedules.id;


--
-- Name: exam_scopes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_scopes (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    division_id integer NOT NULL,
    year_label integer NOT NULL
);


ALTER TABLE public.exam_scopes OWNER TO postgres;

--
-- Name: exam_scopes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exam_scopes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_scopes_id_seq OWNER TO postgres;

--
-- Name: exam_scopes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_scopes_id_seq OWNED BY public.exam_scopes.id;


--
-- Name: exam_subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_subjects (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    subject_id integer NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL
);


ALTER TABLE public.exam_subjects OWNER TO postgres;

--
-- Name: exam_subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exam_subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_subjects_id_seq OWNER TO postgres;

--
-- Name: exam_subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_subjects_id_seq OWNED BY public.exam_subjects.id;


--
-- Name: faculty; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faculty (
    id integer NOT NULL,
    faculty_code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    mobile character varying(15) NOT NULL,
    password_hash character varying(255) NOT NULL,
    must_change_pwd boolean DEFAULT true NOT NULL,
    gender character varying(10),
    dob date,
    qualification character varying(100),
    experience_years integer,
    specialization character varying(150),
    designation character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    profile_completion character varying(20) DEFAULT 'incomplete'::character varying NOT NULL,
    profile_step integer DEFAULT 1 NOT NULL,
    course_id integer NOT NULL,
    address jsonb,
    alternate_mobile character varying(15),
    profile_photo_url character varying(255)
);


ALTER TABLE public.faculty OWNER TO postgres;

--
-- Name: faculty_approval_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faculty_approval_configs (
    id integer NOT NULL,
    request_type_code character varying(50) NOT NULL,
    approval_chain jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.faculty_approval_configs OWNER TO postgres;

--
-- Name: faculty_approval_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.faculty_approval_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.faculty_approval_configs_id_seq OWNER TO postgres;

--
-- Name: faculty_approval_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.faculty_approval_configs_id_seq OWNED BY public.faculty_approval_configs.id;


--
-- Name: faculty_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.faculty_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.faculty_id_seq OWNER TO postgres;

--
-- Name: faculty_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.faculty_id_seq OWNED BY public.faculty.id;


--
-- Name: faculty_request_approvals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faculty_request_approvals (
    id integer NOT NULL,
    request_id integer NOT NULL,
    approver_role character varying(50) NOT NULL,
    approver_user_id integer,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    remarks text,
    sequence_order integer NOT NULL,
    actioned_at timestamp without time zone
);


ALTER TABLE public.faculty_request_approvals OWNER TO postgres;

--
-- Name: faculty_request_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.faculty_request_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.faculty_request_approvals_id_seq OWNER TO postgres;

--
-- Name: faculty_request_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.faculty_request_approvals_id_seq OWNED BY public.faculty_request_approvals.id;


--
-- Name: faculty_request_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faculty_request_documents (
    id integer NOT NULL,
    request_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url character varying(500) NOT NULL,
    file_size integer,
    uploaded_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.faculty_request_documents OWNER TO postgres;

--
-- Name: faculty_request_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.faculty_request_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.faculty_request_documents_id_seq OWNER TO postgres;

--
-- Name: faculty_request_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.faculty_request_documents_id_seq OWNED BY public.faculty_request_documents.id;


--
-- Name: faculty_request_proxies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faculty_request_proxies (
    id integer NOT NULL,
    request_id integer NOT NULL,
    date date NOT NULL,
    slot_id integer NOT NULL,
    original_faculty_id integer NOT NULL,
    proxy_faculty_id integer NOT NULL,
    division_id integer NOT NULL,
    subject_id integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    overridden_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    sender_proxy_faculty_id integer
);


ALTER TABLE public.faculty_request_proxies OWNER TO postgres;

--
-- Name: faculty_request_proxies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.faculty_request_proxies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.faculty_request_proxies_id_seq OWNER TO postgres;

--
-- Name: faculty_request_proxies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.faculty_request_proxies_id_seq OWNED BY public.faculty_request_proxies.id;


--
-- Name: faculty_request_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faculty_request_types (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.faculty_request_types OWNER TO postgres;

--
-- Name: faculty_request_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.faculty_request_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.faculty_request_types_id_seq OWNER TO postgres;

--
-- Name: faculty_request_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.faculty_request_types_id_seq OWNED BY public.faculty_request_types.id;


--
-- Name: faculty_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faculty_requests (
    id integer NOT NULL,
    faculty_id integer NOT NULL,
    request_type_code character varying(50) NOT NULL,
    from_date date NOT NULL,
    to_date date NOT NULL,
    description text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    current_step_index integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.faculty_requests OWNER TO postgres;

--
-- Name: faculty_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.faculty_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.faculty_requests_id_seq OWNER TO postgres;

--
-- Name: faculty_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.faculty_requests_id_seq OWNED BY public.faculty_requests.id;


--
-- Name: faculty_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faculty_roles (
    faculty_id integer NOT NULL,
    role_id integer NOT NULL
);


ALTER TABLE public.faculty_roles OWNER TO postgres;

--
-- Name: faculty_subject_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faculty_subject_assignments (
    id integer NOT NULL,
    semester_id integer NOT NULL,
    faculty_id integer NOT NULL,
    subject_id integer NOT NULL,
    division_id integer NOT NULL,
    subject_type character varying(20) NOT NULL
);


ALTER TABLE public.faculty_subject_assignments OWNER TO postgres;

--
-- Name: faculty_subject_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.faculty_subject_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.faculty_subject_assignments_id_seq OWNER TO postgres;

--
-- Name: faculty_subject_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.faculty_subject_assignments_id_seq OWNED BY public.faculty_subject_assignments.id;


--
-- Name: internal_evaluations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.internal_evaluations (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    student_id integer NOT NULL,
    semester_id integer NOT NULL,
    final_theory_marks numeric(6,2),
    final_practical_marks numeric(6,2),
    is_finalized boolean DEFAULT false NOT NULL,
    finalized_by_faculty_id integer,
    finalized_at timestamp without time zone,
    updated_by_faculty_id integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.internal_evaluations OWNER TO postgres;

--
-- Name: internal_evaluations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.internal_evaluations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.internal_evaluations_id_seq OWNER TO postgres;

--
-- Name: internal_evaluations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.internal_evaluations_id_seq OWNED BY public.internal_evaluations.id;


--
-- Name: internal_exam_marks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.internal_exam_marks (
    id integer NOT NULL,
    internal_exam_id integer NOT NULL,
    assignment_id integer NOT NULL,
    student_id integer NOT NULL,
    theory_marks numeric(6,2),
    practical_marks numeric(6,2),
    is_draft boolean DEFAULT true NOT NULL,
    is_visible boolean DEFAULT false NOT NULL,
    updated_by_faculty_id integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.internal_exam_marks OWNER TO postgres;

--
-- Name: internal_exam_marks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.internal_exam_marks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.internal_exam_marks_id_seq OWNER TO postgres;

--
-- Name: internal_exam_marks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.internal_exam_marks_id_seq OWNED BY public.internal_exam_marks.id;


--
-- Name: internal_exams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.internal_exams (
    id integer NOT NULL,
    semester_id integer NOT NULL,
    exam_name character varying(100) NOT NULL,
    exam_number integer NOT NULL,
    target_type character varying(20) DEFAULT 'ALL'::character varying NOT NULL,
    target_year integer,
    target_division_id integer,
    created_by_faculty_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    academic_year_id integer,
    description text,
    exam_type character varying(20) DEFAULT 'internal'::character varying NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    completed_step integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.internal_exams OWNER TO postgres;

--
-- Name: internal_exams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.internal_exams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.internal_exams_id_seq OWNER TO postgres;

--
-- Name: internal_exams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.internal_exams_id_seq OWNED BY public.internal_exams.id;


--
-- Name: marks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marks (
    id integer NOT NULL,
    student_id integer NOT NULL,
    assignment_id integer NOT NULL,
    semester_id integer NOT NULL,
    internal_theory numeric(6,2),
    external_theory numeric(6,2),
    internal_practical numeric(6,2),
    external_practical numeric(6,2),
    max_internal_theory numeric(6,2),
    max_external_theory numeric(6,2),
    max_internal_practical numeric(6,2),
    max_external_practical numeric(6,2),
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.marks OWNER TO postgres;

--
-- Name: marks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.marks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.marks_id_seq OWNER TO postgres;

--
-- Name: marks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.marks_id_seq OWNED BY public.marks.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rooms (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    is_lab boolean DEFAULT false NOT NULL,
    capacity integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rooms OWNER TO postgres;

--
-- Name: rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rooms_id_seq OWNER TO postgres;

--
-- Name: rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rooms_id_seq OWNED BY public.rooms.id;


--
-- Name: semesters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.semesters (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    academic_year_id integer
);


ALTER TABLE public.semesters OWNER TO postgres;

--
-- Name: semesters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.semesters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.semesters_id_seq OWNER TO postgres;

--
-- Name: semesters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.semesters_id_seq OWNED BY public.semesters.id;


--
-- Name: student_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_documents (
    id integer NOT NULL,
    student_id integer NOT NULL,
    doc_type character varying(50) NOT NULL,
    file_path character varying(255) NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.student_documents OWNER TO postgres;

--
-- Name: student_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_documents_id_seq OWNER TO postgres;

--
-- Name: student_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_documents_id_seq OWNED BY public.student_documents.id;


--
-- Name: student_enrollment_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_enrollment_history (
    id integer NOT NULL,
    student_id integer NOT NULL,
    semester_id integer NOT NULL,
    division_id integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    enrolled_at timestamp without time zone DEFAULT now() NOT NULL,
    archived_at timestamp without time zone
);


ALTER TABLE public.student_enrollment_history OWNER TO postgres;

--
-- Name: student_enrollment_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_enrollment_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_enrollment_history_id_seq OWNER TO postgres;

--
-- Name: student_enrollment_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_enrollment_history_id_seq OWNED BY public.student_enrollment_history.id;


--
-- Name: student_prior_education; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_prior_education (
    id integer NOT NULL,
    student_id integer NOT NULL,
    prev_institution character varying(200) NOT NULL,
    prev_course character varying(100) NOT NULL,
    prev_enrollment_no character varying(50),
    semesters_completed integer NOT NULL,
    reason_for_transfer text
);


ALTER TABLE public.student_prior_education OWNER TO postgres;

--
-- Name: student_prior_education_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_prior_education_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_prior_education_id_seq OWNER TO postgres;

--
-- Name: student_prior_education_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_prior_education_id_seq OWNED BY public.student_prior_education.id;


--
-- Name: student_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_requests (
    id integer NOT NULL,
    student_id integer NOT NULL,
    target_faculty_id integer NOT NULL,
    semester_id integer NOT NULL,
    request_type character varying(50) NOT NULL,
    subject character varying(200) NOT NULL,
    description text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    attachment_url character varying(500),
    attachment_type character varying(50),
    attachment_size integer
);


ALTER TABLE public.student_requests OWNER TO postgres;

--
-- Name: student_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_requests_id_seq OWNER TO postgres;

--
-- Name: student_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_requests_id_seq OWNED BY public.student_requests.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    id integer NOT NULL,
    temp_id character varying(30),
    student_id character varying(20),
    spid character varying(30),
    enrollment_id character varying(30),
    abc_id character varying(30),
    full_name character varying(150) NOT NULL,
    dob date,
    gender character varying(10),
    blood_group character varying(5),
    email character varying(150) NOT NULL,
    mobile character varying(15),
    parent_mobile character varying(15),
    optional_mobile character varying(15),
    address_old text,
    aadhaar_student character varying(20),
    aadhaar_parent character varying(20),
    course_id integer NOT NULL,
    category character varying(10),
    board character varying(20),
    twelfth_percent numeric(5,2),
    twelfth_stream character varying(50),
    school_name character varying(200),
    udise_code character varying(20),
    entry_type character varying(20) DEFAULT 'fresh'::character varying NOT NULL,
    entry_semester_no integer DEFAULT 1 NOT NULL,
    current_semester_no integer,
    current_division_id integer,
    current_division_name character varying(50),
    status character varying(20) DEFAULT 'incomplete'::character varying NOT NULL,
    password_hash character varying(255),
    profile_photo character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    profile_step integer DEFAULT 1 NOT NULL,
    profile_status character varying(20) DEFAULT 'incomplete'::character varying NOT NULL,
    address jsonb
);


ALTER TABLE public.students OWNER TO postgres;

--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.students_id_seq OWNER TO postgres;

--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    subject_type character varying(20) NOT NULL,
    internal_theory_max integer,
    external_theory_max integer,
    theory_passing_marks integer,
    internal_practical_max integer,
    external_practical_max integer,
    practical_passing_marks integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    short_code character varying(20),
    credit integer,
    semester integer,
    course_id integer
);


ALTER TABLE public.subjects OWNER TO postgres;

--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subjects_id_seq OWNER TO postgres;

--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: timetable_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timetable_entries (
    id integer NOT NULL,
    semester_id integer NOT NULL,
    division_id integer NOT NULL,
    assignment_id integer NOT NULL,
    day_of_week character varying(10) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    color character varying(20) DEFAULT '#6366f1'::character varying,
    is_lab boolean DEFAULT false NOT NULL,
    lab_id character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    publish_id character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    slot_id integer
);


ALTER TABLE public.timetable_entries OWNER TO postgres;

--
-- Name: timetable_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.timetable_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timetable_entries_id_seq OWNER TO postgres;

--
-- Name: timetable_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.timetable_entries_id_seq OWNED BY public.timetable_entries.id;


--
-- Name: timetable_slots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timetable_slots (
    id integer NOT NULL,
    slot_number integer NOT NULL,
    label character varying(30) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_break boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.timetable_slots OWNER TO postgres;

--
-- Name: timetable_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.timetable_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timetable_slots_id_seq OWNER TO postgres;

--
-- Name: timetable_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.timetable_slots_id_seq OWNED BY public.timetable_slots.id;


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_vectors OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.vector_indexes OWNER TO supabase_storage_admin;

--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: academic_years id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_years ALTER COLUMN id SET DEFAULT nextval('public.academic_years_id_seq'::regclass);


--
-- Name: administrators id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administrators ALTER COLUMN id SET DEFAULT nextval('public.administrators_id_seq'::regclass);


--
-- Name: attendance_session_ledger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_session_ledger ALTER COLUMN id SET DEFAULT nextval('public.attendance_session_ledger_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: circular_recipients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.circular_recipients ALTER COLUMN id SET DEFAULT nextval('public.circular_recipients_id_seq'::regclass);


--
-- Name: circulars id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.circulars ALTER COLUMN id SET DEFAULT nextval('public.circulars_id_seq'::regclass);


--
-- Name: classroom_benches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_benches ALTER COLUMN id SET DEFAULT nextval('public.classroom_benches_id_seq'::regclass);


--
-- Name: classrooms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms ALTER COLUMN id SET DEFAULT nextval('public.classrooms_id_seq'::regclass);


--
-- Name: counselor_division_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.counselor_division_assignments ALTER COLUMN id SET DEFAULT nextval('public.counselor_division_assignments_id_seq'::regclass);


--
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- Name: divisions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions ALTER COLUMN id SET DEFAULT nextval('public.divisions_id_seq'::regclass);


--
-- Name: exam_eligibility_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_eligibility_rules ALTER COLUMN id SET DEFAULT nextval('public.exam_eligibility_rules_id_seq'::regclass);


--
-- Name: exam_hall_allocations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_hall_allocations ALTER COLUMN id SET DEFAULT nextval('public.exam_hall_allocations_id_seq'::regclass);


--
-- Name: exam_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_schedules ALTER COLUMN id SET DEFAULT nextval('public.exam_schedules_id_seq'::regclass);


--
-- Name: exam_scopes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_scopes ALTER COLUMN id SET DEFAULT nextval('public.exam_scopes_id_seq'::regclass);


--
-- Name: exam_subjects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_subjects ALTER COLUMN id SET DEFAULT nextval('public.exam_subjects_id_seq'::regclass);


--
-- Name: faculty id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty ALTER COLUMN id SET DEFAULT nextval('public.faculty_id_seq'::regclass);


--
-- Name: faculty_approval_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_approval_configs ALTER COLUMN id SET DEFAULT nextval('public.faculty_approval_configs_id_seq'::regclass);


--
-- Name: faculty_request_approvals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_approvals ALTER COLUMN id SET DEFAULT nextval('public.faculty_request_approvals_id_seq'::regclass);


--
-- Name: faculty_request_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_documents ALTER COLUMN id SET DEFAULT nextval('public.faculty_request_documents_id_seq'::regclass);


--
-- Name: faculty_request_proxies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_proxies ALTER COLUMN id SET DEFAULT nextval('public.faculty_request_proxies_id_seq'::regclass);


--
-- Name: faculty_request_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_types ALTER COLUMN id SET DEFAULT nextval('public.faculty_request_types_id_seq'::regclass);


--
-- Name: faculty_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_requests ALTER COLUMN id SET DEFAULT nextval('public.faculty_requests_id_seq'::regclass);


--
-- Name: faculty_subject_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_subject_assignments ALTER COLUMN id SET DEFAULT nextval('public.faculty_subject_assignments_id_seq'::regclass);


--
-- Name: internal_evaluations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_evaluations ALTER COLUMN id SET DEFAULT nextval('public.internal_evaluations_id_seq'::regclass);


--
-- Name: internal_exam_marks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_exam_marks ALTER COLUMN id SET DEFAULT nextval('public.internal_exam_marks_id_seq'::regclass);


--
-- Name: internal_exams id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_exams ALTER COLUMN id SET DEFAULT nextval('public.internal_exams_id_seq'::regclass);


--
-- Name: marks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marks ALTER COLUMN id SET DEFAULT nextval('public.marks_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq'::regclass);


--
-- Name: semesters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semesters ALTER COLUMN id SET DEFAULT nextval('public.semesters_id_seq'::regclass);


--
-- Name: student_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_documents ALTER COLUMN id SET DEFAULT nextval('public.student_documents_id_seq'::regclass);


--
-- Name: student_enrollment_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_enrollment_history ALTER COLUMN id SET DEFAULT nextval('public.student_enrollment_history_id_seq'::regclass);


--
-- Name: student_prior_education id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_prior_education ALTER COLUMN id SET DEFAULT nextval('public.student_prior_education_id_seq'::regclass);


--
-- Name: student_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_requests ALTER COLUMN id SET DEFAULT nextval('public.student_requests_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: timetable_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_entries ALTER COLUMN id SET DEFAULT nextval('public.timetable_entries_id_seq'::regclass);


--
-- Name: timetable_slots id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_slots ALTER COLUMN id SET DEFAULT nextval('public.timetable_slots_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.custom_oauth_providers (id, provider_type, identifier, name, client_id, client_secret, acceptable_client_ids, scopes, pkce_enabled, attribute_mapping, authorization_params, enabled, email_optional, issuer, discovery_url, skip_nonce_check, cached_discovery, discovery_cached_at, authorization_url, token_url, userinfo_url, jwks_uri, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
20260219120000
20260302000000
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.webauthn_challenges (id, user_id, challenge_type, session_data, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transports, backup_eligible, backed_up, friendly_name, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: postgres
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
\.


--
-- Data for Name: academic_years; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.academic_years (id, name, start_year, end_year, is_current, created_at) FROM stdin;
1	2026-27	2026	2027	t	2026-05-19 16:33:51.875565
\.


--
-- Data for Name: administrators; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.administrators (id, admin_code, name, email, mobile, password_hash, must_change_pwd, designation, is_active, created_at, gender, dob, address, alternate_mobile, profile_photo_url, qualification, experience_years, specialization, profile_completion, profile_step) FROM stdin;
1	PRIN001	System Principal	principal@college.edu	9999999901	$2b$10$i8qmC/zROaY8h6MsN6o3Rer.6eqm4fQnjYetq8b6zDnCzKnq8MyTm	f	principal	t	2026-05-25 05:31:38.511335	\N	\N	\N	\N	\N	\N	\N	\N	incomplete	1
2	VP001	System Vice Principal	vp@college.edu	9999999902	$2b$10$3rxfYACqFRQSNTbDtp3hc.XjtBMA0ITifIF0mk.3f5OXDOwLx8XJ2	f	vice_principal	t	2026-05-25 05:31:39.011948	\N	\N	\N	\N	\N	\N	\N	\N	incomplete	1
\.


--
-- Data for Name: attendance_analytics_summary; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_analytics_summary (student_id, division_id, semester_id, present_count, total_lectures, attendance_percentage, updated_at) FROM stdin;
313	7	1	1	1	100.00	2026-05-21 15:23:41.251473
314	7	1	1	1	100.00	2026-05-21 15:23:41.251473
313	7	4	4	4	100.00	2026-05-25 09:56:15.528155
314	7	4	4	4	100.00	2026-05-25 09:56:15.528155
316	8	4	4	4	100.00	2026-05-26 10:04:23.169623
317	8	4	4	4	100.00	2026-05-26 10:04:23.169623
318	8	4	4	4	100.00	2026-05-26 10:04:23.169623
319	8	4	4	4	100.00	2026-05-26 10:04:23.169623
320	8	4	4	4	100.00	2026-05-26 10:04:23.169623
321	8	4	4	4	100.00	2026-05-26 10:04:23.169623
322	8	4	4	4	100.00	2026-05-26 10:04:23.169623
323	8	4	4	4	100.00	2026-05-26 10:04:23.169623
324	8	4	4	4	100.00	2026-05-26 10:04:23.169623
325	8	4	4	4	100.00	2026-05-26 10:04:23.169623
326	8	4	4	4	100.00	2026-05-26 10:04:23.169623
327	8	4	4	4	100.00	2026-05-26 10:04:23.169623
328	8	4	4	4	100.00	2026-05-26 10:04:23.169623
329	8	4	4	4	100.00	2026-05-26 10:04:23.169623
330	8	4	4	4	100.00	2026-05-26 10:04:23.169623
349	8	4	4	4	100.00	2026-05-26 10:04:23.169623
350	8	4	4	4	100.00	2026-05-26 10:04:23.169623
351	8	4	4	4	100.00	2026-05-26 10:04:23.169623
352	8	4	4	4	100.00	2026-05-26 10:04:23.169623
353	8	4	4	4	100.00	2026-05-26 10:04:23.169623
354	8	4	4	4	100.00	2026-05-26 10:04:23.169623
355	8	4	4	4	100.00	2026-05-26 10:04:23.169623
356	8	4	4	4	100.00	2026-05-26 10:04:23.169623
357	8	4	4	4	100.00	2026-05-26 10:04:23.169623
358	8	4	4	4	100.00	2026-05-26 10:04:23.169623
359	8	4	4	4	100.00	2026-05-26 10:04:23.169623
360	8	4	4	4	100.00	2026-05-26 10:04:23.169623
361	8	4	4	4	100.00	2026-05-26 10:04:23.169623
347	8	4	4	4	100.00	2026-05-26 10:04:23.169623
363	8	4	4	4	100.00	2026-05-26 10:04:23.169623
364	8	4	4	4	100.00	2026-05-26 10:04:23.169623
365	8	4	4	4	100.00	2026-05-26 10:04:23.169623
366	8	4	4	4	100.00	2026-05-26 10:04:23.169623
367	8	4	4	4	100.00	2026-05-26 10:04:23.169623
368	8	4	4	4	100.00	2026-05-26 10:04:23.169623
369	8	4	4	4	100.00	2026-05-26 10:04:23.169623
370	8	4	4	4	100.00	2026-05-26 10:04:23.169623
371	8	4	4	4	100.00	2026-05-26 10:04:23.169623
372	8	4	4	4	100.00	2026-05-26 10:04:23.169623
373	8	4	4	4	100.00	2026-05-26 10:04:23.169623
374	8	4	4	4	100.00	2026-05-26 10:04:23.169623
375	8	4	4	4	100.00	2026-05-26 10:04:23.169623
376	8	4	4	4	100.00	2026-05-26 10:04:23.169623
377	8	4	4	4	100.00	2026-05-26 10:04:23.169623
378	8	4	4	4	100.00	2026-05-26 10:04:23.169623
379	8	4	4	4	100.00	2026-05-26 10:04:23.169623
380	8	4	4	4	100.00	2026-05-26 10:04:23.169623
381	8	4	4	4	100.00	2026-05-26 10:04:23.169623
382	8	4	4	4	100.00	2026-05-26 10:04:23.169623
383	8	4	4	4	100.00	2026-05-26 10:04:23.169623
384	8	4	4	4	100.00	2026-05-26 10:04:23.169623
385	8	4	4	4	100.00	2026-05-26 10:04:23.169623
386	8	4	4	4	100.00	2026-05-26 10:04:23.169623
387	8	4	4	4	100.00	2026-05-26 10:04:23.169623
388	8	4	4	4	100.00	2026-05-26 10:04:23.169623
389	8	4	4	4	100.00	2026-05-26 10:04:23.169623
390	8	4	4	4	100.00	2026-05-26 10:04:23.169623
391	8	4	4	4	100.00	2026-05-26 10:04:23.169623
392	8	4	4	4	100.00	2026-05-26 10:04:23.169623
393	8	4	4	4	100.00	2026-05-26 10:04:23.169623
394	8	4	4	4	100.00	2026-05-26 10:04:23.169623
396	8	4	4	4	100.00	2026-05-26 10:04:23.169623
397	8	4	4	4	100.00	2026-05-26 10:04:23.169623
395	8	4	4	4	100.00	2026-05-26 10:04:23.169623
362	8	4	4	4	100.00	2026-05-26 10:04:23.169623
315	8	4	4	4	100.00	2026-05-26 10:04:23.169623
331	8	4	4	4	100.00	2026-05-26 10:04:23.169623
332	8	4	4	4	100.00	2026-05-26 10:04:23.169623
333	8	4	4	4	100.00	2026-05-26 10:04:23.169623
334	8	4	4	4	100.00	2026-05-26 10:04:23.169623
335	8	4	4	4	100.00	2026-05-26 10:04:23.169623
336	8	4	4	4	100.00	2026-05-26 10:04:23.169623
337	8	4	4	4	100.00	2026-05-26 10:04:23.169623
338	8	4	4	4	100.00	2026-05-26 10:04:23.169623
339	8	4	4	4	100.00	2026-05-26 10:04:23.169623
340	8	4	4	4	100.00	2026-05-26 10:04:23.169623
341	8	4	4	4	100.00	2026-05-26 10:04:23.169623
342	8	4	4	4	100.00	2026-05-26 10:04:23.169623
343	8	4	4	4	100.00	2026-05-26 10:04:23.169623
344	8	4	4	4	100.00	2026-05-26 10:04:23.169623
345	8	4	4	4	100.00	2026-05-26 10:04:23.169623
346	8	4	4	4	100.00	2026-05-26 10:04:23.169623
348	8	4	4	4	100.00	2026-05-26 10:04:23.169623
\.


--
-- Data for Name: attendance_session_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_session_ledger (id, semester_id, division_id, faculty_id, date, start_time, end_time, absent_student_ids, created_at, subject_id) FROM stdin;
6	1	7	1	2026-05-19	08:40:00	09:20:00	{}	2026-05-21 15:23:40.876796	12
7	5	11	16	2026-05-25	10:30:00	11:20:00	{}	2026-05-25 09:53:21.710348	32
8	5	11	16	2026-05-25	10:30:00	11:20:00	{}	2026-05-25 09:53:21.772701	32
9	1	16	16	2026-05-25	07:50:00	08:40:00	{}	2026-05-25 09:53:23.640821	41
10	1	18	16	2026-05-25	09:40:00	10:30:00	{}	2026-05-25 09:53:25.48978	41
12	4	7	1	2026-05-25	07:50:00	08:40:00	{}	2026-05-25 09:53:53.872088	16
16	4	7	1	2026-05-25	10:30:00	11:20:00	{}	2026-05-25 09:54:00.74862	16
17	4	7	1	2026-05-25	10:30:00	11:20:00	{}	2026-05-25 09:54:00.750684	16
18	4	7	1	2026-05-25	09:40:00	10:30:00	{}	2026-05-25 09:56:15.528155	16
22	4	8	1	2026-05-26	07:50:00	08:50:00	{}	2026-05-26 10:04:16.971112	16
23	4	8	1	2026-05-26	09:50:00	10:40:00	{}	2026-05-26 10:04:21.296788	16
24	4	8	1	2026-05-26	09:50:00	10:40:00	{}	2026-05-26 10:04:21.326107	16
25	4	8	1	2026-05-26	10:40:00	11:30:00	{}	2026-05-26 10:04:23.169623	16
27	5	13	18	2026-05-26	09:50:00	10:40:00	{}	2026-05-26 10:07:16.956175	25
28	5	13	18	2026-05-26	09:50:00	10:40:00	{}	2026-05-26 10:07:16.956175	25
30	1	17	18	2026-05-26	07:50:00	08:50:00	{}	2026-05-26 10:07:54.138255	37
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, user_type, user_name, action, module, entity_type, entity_id, description, created_at) FROM stdin;
\.


--
-- Data for Name: circular_recipients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.circular_recipients (id, circular_id, division_id) FROM stdin;
\.


--
-- Data for Name: circulars; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.circulars (id, slug, title, description, attachment_url, attachment_type, attachment_size, target_type, target_year, faculty_id, faculty_name, created_at, updated_at, admin_id) FROM stdin;
8	tame-senior-chho-amna-to-aukat-ma-rehjo-r147pq	Tame Senior Chho Amna to Aukat ma rehjo...	<p>Hukum thi.</p>	\N	\N	\N	YEAR	3	1	Amit Patel	2026-05-11 10:55:51.180335	2026-05-11 10:55:51.180335	\N
15	holiday-tommorow-uajt7p	Holiday tommorow	<p>Tomorrow, the college will remain closed due to the NEET examination being conducted on campus.</p><p>All classes and regular academic activities will be suspended for the day.</p><p>Please stay updated through official college communication channels for any further announcements.</p>	\N	\N	\N	ALL	\N	18	Priyanka D Chahuan	2026-05-26 09:49:26.724029	2026-05-26 09:49:26.724029	\N
17	testing-logs-q90v0c	Testing logs	<p>Agar tujhe ho gaya kuch...</p><p></p>	\N	\N	\N	ALL	\N	1	Amit Patel	2026-05-28 05:14:34.262339	2026-05-28 05:14:34.262339	\N
\.


--
-- Data for Name: classroom_benches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classroom_benches (id, classroom_id, label, grid_x, grid_y, max_students, is_active, notes) FROM stdin;
158	1	A1	0	0	2	t	\N
159	1	A4	3	0	2	t	\N
160	1	B1	0	1	3	t	\N
161	1	B2	1	1	3	t	\N
162	1	B3	2	1	3	t	\N
163	1	B4	3	1	3	t	\N
164	1	C1	0	2	3	t	\N
165	1	C2	1	2	3	t	\N
166	1	C3	2	2	3	t	\N
167	1	C4	3	2	3	t	\N
168	1	D1	0	3	3	t	\N
169	1	D2	1	3	3	t	\N
170	1	D3	2	3	3	t	\N
171	1	D4	3	3	3	t	\N
172	1	E1	0	4	3	t	\N
173	1	E2	1	4	3	t	\N
174	1	E3	2	4	3	t	\N
175	1	E4	3	4	3	t	\N
176	1	F1	0	5	3	t	\N
177	1	F2	1	5	3	t	\N
178	1	F3	2	5	3	t	\N
179	1	F4	3	5	3	t	\N
180	1	G1	0	6	3	t	\N
181	1	G2	1	6	3	t	\N
182	1	G3	2	6	3	t	\N
183	1	G4	3	6	3	t	\N
184	1	H1	0	7	3	t	\N
185	1	H2	1	7	3	t	\N
186	1	H3	2	7	3	t	\N
187	1	H4	3	7	3	t	\N
188	1	I1	0	8	3	t	\N
189	1	I2	1	8	3	t	\N
190	1	I3	2	8	3	t	\N
191	1	I4	3	8	3	t	\N
192	1	J1	0	9	3	t	\N
193	1	J2	1	9	3	t	\N
194	1	J3	2	9	3	t	\N
195	1	J4	3	9	3	t	\N
119	2	A1	0	0	2	t	\N
120	2	A4	3	0	3	t	\N
121	2	B1	0	1	3	t	\N
122	2	B2	1	1	3	t	\N
123	2	B3	2	1	3	t	\N
124	2	B4	3	1	3	t	\N
125	2	C1	0	2	3	t	\N
126	2	C2	1	2	3	t	\N
127	2	C3	2	2	3	t	\N
128	2	C4	3	2	3	t	\N
129	2	D1	0	3	3	t	\N
130	2	D2	1	3	3	t	\N
131	2	D3	2	3	3	t	\N
132	2	D4	3	3	3	t	\N
133	2	E1	0	4	3	t	\N
134	2	E2	1	4	3	t	\N
135	2	E3	2	4	3	t	\N
136	2	E4	3	4	3	t	\N
137	2	F1	0	5	3	t	\N
138	2	F2	1	5	3	t	\N
139	2	F3	2	5	3	t	\N
140	2	F4	3	5	3	t	\N
141	2	G1	0	6	3	t	\N
142	2	G2	1	6	3	t	\N
143	2	G3	2	6	3	t	\N
144	2	G4	3	6	3	t	\N
145	2	H1	0	7	3	t	\N
146	2	H2	1	7	3	t	\N
147	2	H3	2	7	3	t	\N
148	2	H4	3	7	3	t	\N
149	2	I1	0	8	3	t	\N
150	2	I2	1	8	3	t	\N
151	2	I3	2	8	3	t	\N
152	2	I4	3	8	3	t	\N
153	2	J1	0	9	3	t	\N
154	2	J2	1	9	3	t	\N
155	2	J3	2	9	3	t	\N
156	2	J4	3	9	3	t	\N
157	2	A3	2	0	3	t	\N
196	3	A1	0	0	2	t	\N
197	3	A3	2	0	3	t	\N
198	3	A4	3	0	3	t	\N
199	3	B1	0	1	3	t	\N
200	3	B2	1	1	3	t	\N
201	3	B3	2	1	3	t	\N
202	3	B4	3	1	3	t	\N
203	3	C1	0	2	3	t	\N
204	3	C2	1	2	3	t	\N
205	3	C3	2	2	3	t	\N
206	3	C4	3	2	3	t	\N
207	3	D1	0	3	3	t	\N
208	3	D2	1	3	3	t	\N
209	3	D3	2	3	3	t	\N
210	3	D4	3	3	3	t	\N
211	3	E1	0	4	3	t	\N
212	3	E2	1	4	3	t	\N
213	3	E3	2	4	3	t	\N
214	3	E4	3	4	3	t	\N
215	3	F1	0	5	3	t	\N
216	3	F2	1	5	3	t	\N
217	3	F3	2	5	3	t	\N
218	3	F4	3	5	3	t	\N
219	3	G1	0	6	3	t	\N
220	3	G2	1	6	3	t	\N
221	3	G3	2	6	3	t	\N
222	3	G4	3	6	3	t	\N
223	3	H1	0	7	3	t	\N
224	3	H2	1	7	3	t	\N
225	3	H3	2	7	3	t	\N
226	3	H4	3	7	3	t	\N
227	3	I1	0	8	3	t	\N
228	3	I2	1	8	3	t	\N
229	3	I3	2	8	3	t	\N
230	3	I4	3	8	3	t	\N
231	3	J1	0	9	3	t	\N
232	3	J2	1	9	3	t	\N
233	3	J3	2	9	3	t	\N
234	3	J4	3	9	3	t	\N
\.


--
-- Data for Name: classrooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classrooms (id, room_code, building_name, floor, lecture_capacity, description, is_active, course_id, created_at) FROM stdin;
1	G1	\N	Ground	80	SYBCADS2	t	2	2026-05-27 09:00:47.453221
2	G2	\N	Ground	80	24BCADS1	t	2	2026-05-27 09:06:51.628304
3	F1	\N	First	80	\N	t	2	2026-05-27 12:10:36.908266
4	F2	\N	First	80	\N	t	2	2026-05-27 12:10:52.9049
5	G3	\N	Ground	80	\N	t	2	2026-05-27 12:11:15.197157
6	F3	\N	First	80	\N	t	2	2026-05-27 12:12:20.875127
7	F4	\N	First	80	\N	t	2	2026-05-27 12:12:38.112784
8	F5	\N	First	80	\N	t	2	2026-05-27 12:12:49.209511
9	G4	\N	Ground	80	\N	t	2	2026-05-27 12:13:08.463052
10	G5	\N	Ground	80	\N	t	2	2026-05-27 12:13:28.878155
11	G6	\N	Ground	80	\N	t	2	2026-05-27 12:13:51.371237
12	G7	\N	Ground	80	\N	t	2	2026-05-27 12:14:01.350198
13	G8	\N	Ground	80	\N	t	2	2026-05-27 12:14:20.865378
14	G9	\N	Ground	80	\N	t	2	2026-05-27 12:14:31.894973
15	G10	\N	Ground	80	\N	t	2	2026-05-27 12:14:43.796211
16	NF1	\N	First	80	\N	t	2	2026-05-27 12:15:13.408068
17	NF2	\N	First	80	\N	t	2	2026-05-27 12:15:28.32732
18	NF3	\N	First	80	\N	t	2	2026-05-27 12:15:39.529649
19	S1	\N	Second	100	\N	t	2	2026-05-27 12:16:01.946779
20	S2	\N	Second	100	\N	t	2	2026-05-27 12:16:17.612217
\.


--
-- Data for Name: counselor_division_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.counselor_division_assignments (id, semester_id, faculty_id, division_id) FROM stdin;
6	4	16	8
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.courses (id, name, code, total_sems) FROM stdin;
2	BCA	BCA_CODE	6
\.


--
-- Data for Name: divisions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.divisions (id, semester_id, course_id, course_code, course_name, semester_no, division_no, display_name, max_capacity, specialization, batch_year, created_at, publish_status) FROM stdin;
7	4	2	BCA	BCA	5	1	24BCADS1	60	DS	24	2026-05-10 06:37:57.960976	draft
8	4	2	BCA	BCA	5	2	24BCADS2	60	DS	24	2026-05-10 06:37:58.231008	draft
9	4	2	BCA	BCA	5	3	24BCAREG3	60	REG	24	2026-05-10 06:37:58.501166	draft
10	4	2	BCA	BCA	5	4	24BCAREG4	60	REG	24	2026-05-10 06:37:58.755954	draft
11	5	2	BCA	BCA	3	1	25BCAAI1	60	AI	25	2026-05-10 06:37:59.036679	draft
12	5	2	BCA	BCA	3	2	25BCADS2	60	DS	25	2026-05-10 06:37:59.300768	draft
13	5	2	BCA	BCA	3	3	25BCAREG3	60	REG	25	2026-05-10 06:37:59.55604	draft
14	5	2	BCA	BCA	3	4	25BCAREG4	60	REG	25	2026-05-10 06:37:59.796277	draft
15	5	2	BCA	BCA	3	5	25BCAREG5	60	REG	25	2026-05-10 06:38:00.151256	draft
16	1	2	BCA	BCA	1	1	26BCAAI1	60	AI	26	2026-05-10 06:38:00.436183	draft
17	1	2	BCA	BCA	1	2	26BCADS2	60	DS	26	2026-05-10 06:38:00.730833	draft
18	1	2	BCA	BCA	1	3	26BCAREG3	60	REG	26	2026-05-10 06:38:00.991086	draft
19	1	2	BCA	BCA	1	4	26BCAREG4	60	REG	26	2026-05-10 06:38:01.260908	draft
20	1	2	BCA	BCA	1	5	26BCAREG5	60	REG	26	2026-05-10 06:38:01.540709	draft
21	6	2	BCA	BCA	7	1	23BCAREG1	60	REG	23	2026-05-10 06:38:01.856323	draft
\.


--
-- Data for Name: exam_eligibility_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exam_eligibility_rules (id, exam_id, year_label, min_attendance_percent, allow_approval_override, approval_deadline) FROM stdin;
1	3	1	75	f	\N
2	3	2	75	f	\N
\.


--
-- Data for Name: exam_hall_allocations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exam_hall_allocations (id, exam_id, classroom_id, sequence_order) FROM stdin;
\.


--
-- Data for Name: exam_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exam_schedules (id, exam_id, exam_date, start_time, end_time, exam_subject_id) FROM stdin;
\.


--
-- Data for Name: exam_scopes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exam_scopes (id, exam_id, division_id, year_label) FROM stdin;
1	3	11	2
2	3	12	2
3	3	13	2
4	3	14	2
5	3	15	2
6	3	16	1
7	3	17	1
8	3	18	1
9	3	19	1
10	3	20	1
\.


--
-- Data for Name: exam_subjects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exam_subjects (id, exam_id, subject_id, duration_minutes) FROM stdin;
\.


--
-- Data for Name: faculty; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faculty (id, faculty_code, name, email, mobile, password_hash, must_change_pwd, gender, dob, qualification, experience_years, specialization, designation, is_active, created_at, profile_completion, profile_step, course_id, address, alternate_mobile, profile_photo_url) FROM stdin;
15	KB	Kajal Bhanushali	kb@pipy.site	9000000001	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:53.770696	incomplete	1	2	\N	\N	\N
16	PRS	Priya R Sharma	prs@pipy.site	9000000002	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:54.011337	incomplete	1	2	\N	\N	\N
18	PDC	Priyanka D Chahuan	pdc@pipy.site	9000000004	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:54.510677	incomplete	1	2	\N	\N	\N
19	KJP	Krishna J Patel	kjp@pipy.site	9000000005	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:54.775685	incomplete	1	2	\N	\N	\N
20	RKP	Rinkal K Patel	rkp@pipy.site	9000000006	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:55.015748	incomplete	1	2	\N	\N	\N
21	NSP	Nidhi S Patel	nsp@pipy.site	9000000007	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:55.255815	incomplete	1	2	\N	\N	\N
22	NVP	Nikita V Patel	nvp@pipy.site	9000000008	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:55.520565	incomplete	1	2	\N	\N	\N
23	MAP	Mansi A Patel	map@pipy.site	9000000009	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:55.781084	incomplete	1	2	\N	\N	\N
24	YHP	Yuvraj H Patel	yhp@pipy.site	9000000010	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:56.056453	incomplete	1	2	\N	\N	\N
25	DK	David Kokani	dk@pipy.site	9000000011	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:56.321089	incomplete	1	2	\N	\N	\N
26	SFP	Shreya F Patel	sfp@pipy.site	9000000012	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:56.610988	incomplete	1	2	\N	\N	\N
27	PP	Payal Patel	pp@pipy.site	9000000013	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:56.860756	incomplete	1	2	\N	\N	\N
28	DM	Dhruv Mistry	dm@pipy.site	9000000014	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:57.130703	incomplete	1	2	\N	\N	\N
29	DVM	Divyesh V Maisuriya	dvm@pipy.site	9000000015	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:57.401345	incomplete	1	2	\N	\N	\N
30	KHETVI	Khetvi	khetvi@pipy.site	9000000016	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:57.686412	incomplete	1	2	\N	\N	\N
17	BR	Bhavin Rabbari	bhavinrabbari@vtcbcsr.edu.in	9000000003	$2b$10$FYaZ7i2g04fqfVQabW6b7.FvUx0q4r1cAcndbpNdlEHVajbBqiwaa	t	\N	\N	\N	\N	\N	\N	t	2026-05-10 06:37:54.270965	incomplete	1	2	\N	\N	\N
31	QUIZ	Quiz Placeholder	quiz-placeholder@erp.local	0000000000	placeholder	t	\N	\N	\N	\N	\N	\N	t	2026-05-21 06:10:05.320164	incomplete	1	2	\N	\N	\N
1	ARP	Amit Patel	hod@college.edu	9316765687	$2b$10$8fPC6UNRD4KeDkCq1.E7.uWxlqFbmSJRazB0f4xIfKYEmqBiQZd4u	t	male	1996-06-04	PHD	15	All	Head of Department	t	2026-04-29 05:29:46.4105	complete	5	2	\N	\N	faculty/1/profile_photo_1779440756789.webp
\.


--
-- Data for Name: faculty_approval_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faculty_approval_configs (id, request_type_code, approval_chain, is_active, created_at, updated_at) FROM stdin;
1	leave_approval	["HOD", "PRINCIPAL"]	t	2026-05-25 10:26:00.467216	2026-05-25 10:26:00.467216
2	work_from_home	["HOD"]	t	2026-05-25 10:26:00.467216	2026-05-25 10:26:00.467216
\.


--
-- Data for Name: faculty_request_approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faculty_request_approvals (id, request_id, approver_role, approver_user_id, status, remarks, sequence_order, actioned_at) FROM stdin;
3	2	HOD	1	approve	\N	0	2026-05-25 18:25:13.884
4	2	PRINCIPAL	1	approve	\N	1	2026-05-25 18:25:36.864
5	3	HOD	1	approve	\N	0	2026-05-25 18:29:55.693
6	3	PRINCIPAL	1	approve	\N	1	2026-05-25 18:31:12.73
7	4	HOD	1	approve	\N	0	2026-05-25 18:35:00.041
8	4	PRINCIPAL	1	approve	\N	1	2026-05-25 18:36:00.479
9	5	HOD	1	approve	\N	0	2026-05-25 18:42:58.822
10	5	PRINCIPAL	1	approve	\N	1	2026-05-25 18:43:47.201
12	6	PRINCIPAL	\N	pending	\N	1	\N
11	6	HOD	1	approve	\N	0	2026-05-26 05:30:23.635
\.


--
-- Data for Name: faculty_request_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faculty_request_documents (id, request_id, file_name, file_url, file_size, uploaded_at) FROM stdin;
\.


--
-- Data for Name: faculty_request_proxies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faculty_request_proxies (id, request_id, date, slot_id, original_faculty_id, proxy_faculty_id, division_id, subject_id, status, overridden_by, created_at, updated_at, sender_proxy_faculty_id) FROM stdin;
1	2	2026-05-26	18	16	18	12	31	approved	\N	2026-05-25 18:15:28.792496	2026-05-25 18:25:36.922	18
2	2	2026-05-26	13	16	22	18	41	approved	\N	2026-05-25 18:15:28.792496	2026-05-25 18:25:36.922	22
3	2	2026-05-26	14	16	1	18	41	approved	\N	2026-05-25 18:15:28.792496	2026-05-25 18:25:36.922	1
4	2	2026-05-26	17	16	27	18	41	approved	\N	2026-05-25 18:15:28.792496	2026-05-25 18:25:36.922	27
5	3	2026-05-27	16	16	18	11	32	approved	\N	2026-05-25 18:29:29.710785	2026-05-25 18:31:12.769	18
6	3	2026-05-27	13	16	27	12	31	approved	\N	2026-05-25 18:29:29.710785	2026-05-25 18:31:12.769	27
7	3	2026-05-27	17	16	1	15	24	approved	\N	2026-05-25 18:29:29.710785	2026-05-25 18:31:12.769	1
8	3	2026-05-27	14	16	31	16	41	approved	\N	2026-05-25 18:29:29.710785	2026-05-25 18:31:12.769	31
9	4	2026-05-27	14	18	26	17	37	approved	\N	2026-05-25 18:34:40.23061	2026-05-25 18:36:00.518	26
10	4	2026-05-27	17	18	21	19	37	approved	\N	2026-05-25 18:34:40.23061	2026-05-25 18:36:00.518	21
11	4	2026-05-27	13	18	28	20	37	approved	\N	2026-05-25 18:34:40.23061	2026-05-25 18:36:00.518	28
12	5	2026-05-29	14	21	16	13	35	approved	\N	2026-05-25 18:42:42.021496	2026-05-25 18:43:47.25	16
13	5	2026-05-29	18	21	15	15	30	approved	\N	2026-05-25 18:42:42.021496	2026-05-25 18:43:47.25	15
14	5	2026-05-30	16	21	16	13	30	approved	\N	2026-05-25 18:42:42.021496	2026-05-25 18:43:47.25	16
15	5	2026-05-30	14	21	23	13	35	approved	\N	2026-05-25 18:42:42.021496	2026-05-25 18:43:47.25	23
16	5	2026-05-30	13	21	30	15	30	approved	\N	2026-05-25 18:42:42.021496	2026-05-25 18:43:47.25	30
17	6	2026-05-27	13	18	31	20	37	pending	\N	2026-05-26 05:14:38.556013	2026-05-26 05:14:38.556013	31
18	6	2026-05-27	14	18	28	17	37	pending	\N	2026-05-26 05:14:38.556013	2026-05-26 05:14:38.556013	28
19	6	2026-05-27	16	16	1	11	32	pending	\N	2026-05-26 05:14:38.556013	2026-05-26 05:14:38.556013	1
20	6	2026-05-27	17	18	30	19	37	pending	\N	2026-05-26 05:14:38.556013	2026-05-26 05:14:38.556013	30
\.


--
-- Data for Name: faculty_request_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faculty_request_types (id, code, name, description, is_active, created_at, updated_at) FROM stdin;
1	leave_approval	Leave Approval	Requests for leave that display faculty lecture slots and require proxies	t	2026-05-25 10:26:00.454495	2026-05-25 10:26:00.454495
2	work_from_home	Work From Home	Requests for work from home that do not require classroom proxies	t	2026-05-25 10:26:00.454495	2026-05-25 10:26:00.454495
\.


--
-- Data for Name: faculty_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faculty_requests (id, faculty_id, request_type_code, from_date, to_date, description, status, current_step_index, created_at, updated_at) FROM stdin;
2	16	leave_approval	2026-05-26	2026-05-26	Mathu dukhtu che	approved	1	2026-05-25 18:15:28.792496	2026-05-25 18:25:36.886
3	16	leave_approval	2026-05-27	2026-05-27	Ni saru thayu	approved	1	2026-05-25 18:29:29.710785	2026-05-25 18:31:12.75
4	18	leave_approval	2026-05-27	2026-05-27	amj	approved	1	2026-05-25 18:34:40.23061	2026-05-25 18:36:00.498
5	21	leave_approval	2026-05-29	2026-05-30	Farva	approved	1	2026-05-25 18:42:42.021496	2026-05-25 18:43:47.228
6	18	leave_approval	2026-05-27	2026-05-27	J are 	pending	1	2026-05-26 05:14:38.556013	2026-05-26 05:30:23.741
\.


--
-- Data for Name: faculty_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faculty_roles (faculty_id, role_id) FROM stdin;
1	4
1	2
1	1
1	3
15	2
16	2
17	2
18	2
19	2
20	2
21	2
22	2
23	2
24	2
25	2
26	2
27	2
28	2
29	2
30	2
\.


--
-- Data for Name: faculty_subject_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faculty_subject_assignments (id, semester_id, faculty_id, subject_id, division_id, subject_type) FROM stdin;
380	4	1	16	7	both
381	4	30	13	7	theory
382	4	15	15	7	both
383	4	23	12	7	both
384	4	25	17	7	theory
385	4	19	14	7	project_minor
386	4	31	51	7	theory
387	4	23	12	8	both
388	4	30	13	8	theory
389	4	1	16	8	both
390	4	19	14	8	project_minor
391	4	17	15	8	both
392	4	25	17	8	theory
393	4	31	51	8	theory
394	4	21	22	9	both
395	4	26	23	9	theory
396	4	28	19	9	theory
397	4	27	21	9	both
398	4	20	18	9	both
399	4	24	20	9	both
400	4	31	51	9	theory
401	4	27	21	10	both
402	4	22	18	10	both
403	4	23	22	10	both
404	4	29	19	10	theory
405	4	24	20	10	both
406	4	26	23	10	theory
407	4	31	51	10	theory
408	5	26	26	11	theory
409	5	20	24	11	theory
410	5	19	29	11	both
411	5	16	32	11	both
412	5	20	33	11	both
413	5	22	35	11	theory
414	5	31	51	11	theory
415	5	29	33	12	both
416	5	26	26	12	theory
417	5	19	24	12	theory
418	5	28	28	12	both
419	5	15	35	12	theory
420	5	16	31	12	both
421	5	31	51	12	theory
422	5	25	27	13	both
423	5	21	30	13	both
424	5	18	25	13	theory
425	5	29	33	13	both
426	5	24	24	13	theory
427	5	21	35	13	theory
428	5	31	51	13	theory
429	5	28	30	14	both
430	5	17	24	14	theory
431	5	24	33	14	both
432	5	22	25	14	theory
433	5	21	27	14	both
434	5	27	35	14	theory
435	5	31	51	14	theory
436	5	24	33	15	both
437	5	15	25	15	theory
438	5	21	30	15	both
439	5	25	27	15	both
440	5	16	24	15	theory
441	5	25	35	15	theory
442	5	31	51	15	theory
443	1	16	41	16	both
444	1	22	37	16	theory
445	1	30	46	16	theory
446	1	15	36	16	theory
447	1	19	42	16	both
448	1	17	40	16	theory
449	1	31	51	16	theory
450	1	20	41	17	both
451	1	25	39	17	theory
452	1	17	43	17	both
453	1	18	37	17	theory
454	1	26	36	17	theory
455	1	27	46	17	theory
456	1	31	51	17	theory
457	1	22	37	18	theory
458	1	27	38	18	theory
459	1	16	41	18	both
460	1	15	44	18	both
461	1	29	46	18	theory
462	1	18	36	18	theory
463	1	31	51	18	theory
464	1	18	37	19	theory
465	1	28	38	19	theory
466	1	20	41	19	both
467	1	30	44	19	both
468	1	27	46	19	theory
469	1	26	36	19	theory
470	1	31	51	19	theory
471	1	30	44	20	both
472	1	18	37	20	theory
473	1	27	41	20	both
474	1	26	46	20	theory
475	1	29	38	20	theory
476	1	15	36	20	theory
477	1	31	51	20	theory
478	6	17	49	21	both
479	6	1	47	21	theory
480	6	24	48	21	both
481	6	23	50	21	both
\.


--
-- Data for Name: internal_evaluations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.internal_evaluations (id, assignment_id, student_id, semester_id, final_theory_marks, final_practical_marks, is_finalized, finalized_by_faculty_id, finalized_at, updated_by_faculty_id, updated_at) FROM stdin;
\.


--
-- Data for Name: internal_exam_marks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.internal_exam_marks (id, internal_exam_id, assignment_id, student_id, theory_marks, practical_marks, is_draft, is_visible, updated_by_faculty_id, updated_at) FROM stdin;
\.


--
-- Data for Name: internal_exams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.internal_exams (id, semester_id, exam_name, exam_number, target_type, target_year, target_division_id, created_by_faculty_id, created_at, academic_year_id, description, exam_type, status, completed_step, updated_at) FROM stdin;
3	1	Intarnal 1	1	ALL	\N	\N	1	2026-05-29 05:49:02.482962	\N	\N	internal	draft	3	2026-05-29 05:50:48.417
\.


--
-- Data for Name: marks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.marks (id, student_id, assignment_id, semester_id, internal_theory, external_theory, internal_practical, external_practical, max_internal_theory, max_external_theory, max_internal_practical, max_external_practical, updated_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name) FROM stdin;
1	student
2	faculty
3	counselor
4	hod
5	principal
6	vice_principal
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rooms (id, code, name, is_lab, capacity, created_at) FROM stdin;
21	LAB-3	LAB-3	t	\N	2026-05-25 10:54:35.098781
22	LAB-2	LAB-2	t	\N	2026-05-25 10:54:35.098781
23	LAB-4	LAB-4	t	\N	2026-05-25 10:54:35.098781
24	LAB-1	LAB-1	t	\N	2026-05-25 10:54:35.098781
25	LAB-5	LAB-5	t	\N	2026-05-25 10:54:35.098781
\.


--
-- Data for Name: semesters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.semesters (id, name, start_date, end_date, is_active, academic_year_id) FROM stdin;
1	Semester 1	2026-06-01	2026-11-30	t	1
2	Sem 3 (2025)	2025-04-30	2025-10-30	t	1
3	Sem 5 (2024)	2024-08-31	2025-02-27	t	1
4	Semester 5	2026-01-01	2026-06-30	t	1
5	Semester 3	2026-01-01	2026-06-30	t	1
6	Semester 7	2026-01-01	2026-06-30	t	1
\.


--
-- Data for Name: student_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_documents (id, student_id, doc_type, file_path, uploaded_at) FROM stdin;
\.


--
-- Data for Name: student_enrollment_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_enrollment_history (id, student_id, semester_id, division_id, status, enrolled_at, archived_at) FROM stdin;
1	313	4	8	active	2026-05-11 11:01:56.022272	\N
2	314	4	8	active	2026-05-11 11:01:56.022272	\N
3	315	4	8	active	2026-05-11 11:01:56.022272	\N
4	316	4	8	active	2026-05-11 11:01:56.022272	\N
5	317	4	8	active	2026-05-11 11:01:56.022272	\N
6	318	4	8	active	2026-05-11 11:01:56.022272	\N
7	319	4	8	active	2026-05-11 11:01:56.022272	\N
8	320	4	8	active	2026-05-11 11:01:56.022272	\N
9	321	4	8	active	2026-05-11 11:01:56.022272	\N
10	322	4	8	active	2026-05-11 11:01:56.022272	\N
11	323	4	8	active	2026-05-11 11:01:56.022272	\N
12	324	4	8	active	2026-05-11 11:01:56.022272	\N
13	325	4	8	active	2026-05-11 11:01:56.022272	\N
14	326	4	8	active	2026-05-11 11:01:56.022272	\N
15	327	4	8	active	2026-05-11 11:01:56.022272	\N
16	328	4	8	active	2026-05-11 11:01:56.022272	\N
17	329	4	8	active	2026-05-11 11:01:56.022272	\N
18	330	4	8	active	2026-05-11 11:01:56.022272	\N
19	331	4	8	active	2026-05-11 11:01:56.022272	\N
20	332	4	8	active	2026-05-11 11:01:56.022272	\N
21	333	4	8	active	2026-05-11 11:01:56.022272	\N
22	334	4	8	active	2026-05-11 11:01:56.022272	\N
23	335	4	8	active	2026-05-11 11:01:56.022272	\N
24	336	4	8	active	2026-05-11 11:01:56.022272	\N
25	337	4	8	active	2026-05-11 11:01:56.022272	\N
26	338	4	8	active	2026-05-11 11:01:56.022272	\N
27	339	4	8	active	2026-05-11 11:01:56.022272	\N
28	340	4	8	active	2026-05-11 11:01:56.022272	\N
29	341	4	8	active	2026-05-11 11:01:56.022272	\N
30	342	4	8	active	2026-05-11 11:01:56.022272	\N
31	343	4	8	active	2026-05-11 11:01:56.022272	\N
32	344	4	8	active	2026-05-11 11:01:56.022272	\N
33	345	4	8	active	2026-05-11 11:01:56.022272	\N
34	346	4	8	active	2026-05-11 11:01:56.022272	\N
35	347	4	8	active	2026-05-11 11:01:56.022272	\N
36	348	4	8	active	2026-05-11 11:01:56.022272	\N
37	349	4	8	active	2026-05-11 11:01:56.022272	\N
38	350	4	8	active	2026-05-11 11:01:56.022272	\N
39	351	4	8	active	2026-05-11 11:01:56.022272	\N
40	352	4	8	active	2026-05-11 11:01:56.022272	\N
41	353	4	8	active	2026-05-11 11:01:56.022272	\N
42	354	4	8	active	2026-05-11 11:01:56.022272	\N
43	355	4	8	active	2026-05-11 11:01:56.022272	\N
44	356	4	8	active	2026-05-11 11:01:56.022272	\N
45	357	4	8	active	2026-05-11 11:01:56.022272	\N
46	358	4	8	active	2026-05-11 11:01:56.022272	\N
47	359	4	8	active	2026-05-11 11:01:56.022272	\N
48	360	4	8	active	2026-05-11 11:01:56.022272	\N
49	361	4	8	active	2026-05-11 11:01:56.022272	\N
50	363	4	8	active	2026-05-11 11:01:56.022272	\N
51	364	4	8	active	2026-05-11 11:01:56.022272	\N
52	365	4	8	active	2026-05-11 11:01:56.022272	\N
53	366	4	8	active	2026-05-11 11:01:56.022272	\N
54	367	4	8	active	2026-05-11 11:01:56.022272	\N
55	368	4	8	active	2026-05-11 11:01:56.022272	\N
56	369	4	8	active	2026-05-11 11:01:56.022272	\N
57	370	4	8	active	2026-05-11 11:01:56.022272	\N
58	371	4	8	active	2026-05-11 11:01:56.022272	\N
59	372	4	8	active	2026-05-11 11:01:56.022272	\N
60	373	4	8	active	2026-05-11 11:01:56.022272	\N
61	374	4	8	active	2026-05-11 11:01:56.022272	\N
62	375	4	8	active	2026-05-11 11:01:56.022272	\N
63	376	4	8	active	2026-05-11 11:01:56.022272	\N
64	377	4	8	active	2026-05-11 11:01:56.022272	\N
65	378	4	8	active	2026-05-11 11:01:56.022272	\N
66	379	4	8	active	2026-05-11 11:01:56.022272	\N
67	380	4	8	active	2026-05-11 11:01:56.022272	\N
68	381	4	8	active	2026-05-11 11:01:56.022272	\N
69	382	4	8	active	2026-05-11 11:01:56.022272	\N
70	383	4	8	active	2026-05-11 11:01:56.022272	\N
71	384	4	8	active	2026-05-11 11:01:56.022272	\N
72	385	4	8	active	2026-05-11 11:01:56.022272	\N
73	386	4	8	active	2026-05-11 11:01:56.022272	\N
74	387	4	8	active	2026-05-11 11:01:56.022272	\N
75	388	4	8	active	2026-05-11 11:01:56.022272	\N
76	389	4	8	active	2026-05-11 11:01:56.022272	\N
77	390	4	8	active	2026-05-11 11:01:56.022272	\N
78	391	4	8	active	2026-05-11 11:01:56.022272	\N
79	392	4	8	active	2026-05-11 11:01:56.022272	\N
80	393	4	8	active	2026-05-11 11:01:56.022272	\N
81	394	4	8	active	2026-05-11 11:01:56.022272	\N
82	395	4	8	active	2026-05-11 11:01:56.022272	\N
83	396	4	8	active	2026-05-11 11:01:56.022272	\N
84	397	4	8	active	2026-05-11 11:01:56.022272	\N
85	362	4	8	active	2026-05-11 11:01:56.022272	\N
86	313	1	7	active	2026-05-19 17:28:47.738766	\N
87	314	1	7	active	2026-05-19 17:28:47.738766	\N
\.


--
-- Data for Name: student_prior_education; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_prior_education (id, student_id, prev_institution, prev_course, prev_enrollment_no, semesters_completed, reason_for_transfer) FROM stdin;
\.


--
-- Data for Name: student_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_requests (id, student_id, target_faculty_id, semester_id, request_type, subject, description, status, remarks, created_at, updated_at, attachment_url, attachment_type, attachment_size) FROM stdin;
5	362	16	1	general	Leave Request	Bhuk Lageli che	approved	\N	2026-05-25 09:52:31.603154	2026-05-25 09:52:49.716	\N	\N	\N
7	362	1	1	general	Sorry	Same	pending	\N	2026-05-26 06:12:09.338897	2026-05-26 06:12:09.338897	\N	\N	\N
8	362	1	1	general	test	hy	pending	\N	2026-05-26 06:22:28.315589	2026-05-26 06:22:28.315589	\N	\N	\N
9	362	1	1	general	hey	wow	pending	\N	2026-05-26 06:24:16.756286	2026-05-26 06:24:16.756286	\N	\N	\N
10	362	1	1	general	aa	a	approved	\N	2026-05-26 06:29:32.363636	2026-05-26 06:30:13.154	\N	\N	\N
11	362	1	1	general	by	y	pending	\N	2026-05-26 06:31:44.858614	2026-05-26 06:31:44.858614	\N	\N	\N
6	362	18	1	general	Love you mam!!	Sorry	approved	\N	2026-05-26 05:00:39.199724	2026-05-26 09:51:35.647	\N	\N	\N
12	362	1	1	general	ds	fd	approved	\N	2026-05-26 06:32:40.943469	2026-05-26 09:53:34.466	\N	\N	\N
13	362	18	1	general	Late assingment	Sorry mam due to bimary, i cant give you assingment; baki tame kaho to jaan aapi dev	approved	\N	2026-05-26 09:56:43.629994	2026-05-26 09:57:06.999	\N	\N	\N
14	362	1	1	general	Sory	Ha	approved	\N	2026-05-28 14:04:19.095794	2026-05-28 14:04:57.172	students/362/request_attachment_1779977058647.png	image/png	808140
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (id, temp_id, student_id, spid, enrollment_id, abc_id, full_name, dob, gender, blood_group, email, mobile, parent_mobile, optional_mobile, address_old, aadhaar_student, aadhaar_parent, course_id, category, board, twelfth_percent, twelfth_stream, school_name, udise_code, entry_type, entry_semester_no, current_semester_no, current_division_id, current_division_name, status, password_hash, profile_photo, created_at, profile_step, profile_status, address) FROM stdin;
316	\N	24BCADS089	\N	\N	\N	Sneha Desai	\N	\N	\N	sneha.desai89@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
317	\N	24BCADS090	\N	\N	\N	Sneha Trivedi	\N	\N	\N	sneha.trivedi90@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
318	\N	24BCADS091	\N	\N	\N	Ananya Joshi	\N	\N	\N	ananya.joshi91@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
319	\N	24BCADS092	\N	\N	\N	Karan Mehta	\N	\N	\N	karan.mehta92@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
320	\N	24BCADS093	\N	\N	\N	Neha Verma	\N	\N	\N	neha.verma93@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
321	\N	24BCADS094	\N	\N	\N	Krishna Bhat	\N	\N	\N	krishna.bhat94@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
322	\N	24BCADS095	\N	\N	\N	Harsh Iyer	\N	\N	\N	harsh.iyer95@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
323	\N	24BCADS096	\N	\N	\N	Yash Pandya	\N	\N	\N	yash.pandya96@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
324	\N	24BCADS097	\N	\N	\N	Arjun Reddy	\N	\N	\N	arjun.reddy97@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
325	\N	24BCADS098	\N	\N	\N	Pooja Singh	\N	\N	\N	pooja.singh98@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
326	\N	24BCADS099	\N	\N	\N	Rohan Mehta	\N	\N	\N	rohan.mehta99@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
327	\N	24BCADS100	\N	\N	\N	Sai Chauhan	\N	\N	\N	sai.chauhan100@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
328	\N	24BCADS101	\N	\N	\N	Rohan Malhotra	\N	\N	\N	rohan.malhotra101@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
329	\N	24BCADS102	\N	\N	\N	Sneha Verma	\N	\N	\N	sneha.verma102@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
330	\N	24BCADS103	\N	\N	\N	Harsh Kapoor	\N	\N	\N	harsh.kapoor103@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
331	\N	24BCADS104	\N	\N	\N	Kavya Desai	\N	\N	\N	kavya.desai104@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
332	\N	24BCADS105	\N	\N	\N	Yash Kulkarni	\N	\N	\N	yash.kulkarni105@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
333	\N	24BCADS106	\N	\N	\N	Dev Gupta	\N	\N	\N	dev.gupta106@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
334	\N	24BCADS107	\N	\N	\N	Nikhil Singh	\N	\N	\N	nikhil.singh107@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
335	\N	24BCADS108	\N	\N	\N	Ananya Sharma	\N	\N	\N	ananya.sharma108@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
336	\N	24BCADS109	\N	\N	\N	Aditi Chauhan	\N	\N	\N	aditi.chauhan109@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
337	\N	24BCADS110	\N	\N	\N	Ishaan Bhat	\N	\N	\N	ishaan.bhat110@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
338	\N	24BCADS111	\N	\N	\N	Harsh Singh	\N	\N	\N	harsh.singh111@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
339	\N	24BCADS112	\N	\N	\N	Krishna Patel	\N	\N	\N	krishna.patel112@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
340	\N	24BCADS113	\N	\N	\N	Priya Kapoor	\N	\N	\N	priya.kapoor113@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
341	\N	24BCADS114	\N	\N	\N	Pooja Reddy	\N	\N	\N	pooja.reddy114@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
342	\N	24BCADS115	\N	\N	\N	Vivaan Pandya	\N	\N	\N	vivaan.pandya115@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
343	\N	24BCADS116	\N	\N	\N	Kavya Chauhan	\N	\N	\N	kavya.chauhan116@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
344	\N	24BCADS117	\N	\N	\N	Krishna Bhat	\N	\N	\N	krishna.bhat117@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
345	\N	24BCADS118	\N	\N	\N	Aditya Singh	\N	\N	\N	aditya.singh118@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
346	\N	24BCADS119	\N	\N	\N	Ananya Gupta	\N	\N	\N	ananya.gupta119@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
348	\N	24BCADS121	\N	\N	\N	Ananya Chauhan	\N	\N	\N	ananya.chauhan121@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
349	\N	24BCADS122	\N	\N	\N	Rahul Sharma	\N	\N	\N	rahul.sharma122@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
350	\N	24BCADS123	\N	\N	\N	Aditya Reddy	\N	\N	\N	aditya.reddy123@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
351	\N	24BCADS124	\N	\N	\N	Nikhil Malhotra	\N	\N	\N	nikhil.malhotra124@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
352	\N	24BCADS125	\N	\N	\N	Ishaan Verma	\N	\N	\N	ishaan.verma125@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
353	\N	24BCADS126	\N	\N	\N	Aditya Mishra	\N	\N	\N	aditya.mishra126@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
354	\N	24BCADS127	\N	\N	\N	Ishaan Gupta	\N	\N	\N	ishaan.gupta127@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
355	\N	24BCADS128	\N	\N	\N	Dev Malhotra	\N	\N	\N	dev.malhotra128@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
356	\N	24BCADS129	\N	\N	\N	Karan Nair	\N	\N	\N	karan.nair129@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
357	\N	24BCADS130	\N	\N	\N	Arjun Verma	\N	\N	\N	arjun.verma130@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
358	\N	24BCADS131	\N	\N	\N	Pooja Iyer	\N	\N	\N	pooja.iyer131@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
359	\N	24BCADS132	\N	\N	\N	Diya Joshi	\N	\N	\N	diya.joshi132@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
360	\N	24BCADS133	\N	\N	\N	Kavya Pandya	\N	\N	\N	kavya.pandya133@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
361	\N	24BCADS134	\N	\N	\N	Aditi Joshi	\N	\N	\N	aditi.joshi134@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
313	\N	24BCADS086	\N	\N	\N	Yash Iyer	\N	\N	\N	yash.iyer86@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	7	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
314	\N	24BCADS087	\N	\N	\N	Pooja Joshi	\N	\N	\N	pooja.joshi87@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	7	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
347	\N	24BCADS120	\N	\N	\N	Priti Patil	\N	\N	\N	24bcads120@vtcbcsr.edu.in	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
363	\N	24BCADS136	\N	\N	\N	Sneha Mehta	\N	\N	\N	sneha.mehta136@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
364	\N	24BCADS137	\N	\N	\N	Arjun Mehta	\N	\N	\N	arjun.mehta137@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
365	\N	24BCADS138	\N	\N	\N	Rohan Singh	\N	\N	\N	rohan.singh138@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
366	\N	24BCADS139	\N	\N	\N	Aarav Agarwal	\N	\N	\N	aarav.agarwal139@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
367	\N	24BCADS140	\N	\N	\N	Arjun Mishra	\N	\N	\N	arjun.mishra140@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
368	\N	24BCADS141	\N	\N	\N	Arjun Iyer	\N	\N	\N	arjun.iyer141@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
369	\N	24BCADS142	\N	\N	\N	Neha Bhat	\N	\N	\N	neha.bhat142@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
370	\N	24BCADS143	\N	\N	\N	Aditi Malhotra	\N	\N	\N	aditi.malhotra143@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
371	\N	24BCADS144	\N	\N	\N	Karan Sharma	\N	\N	\N	karan.sharma144@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
372	\N	24BCADS145	\N	\N	\N	Rohan Bhat	\N	\N	\N	rohan.bhat145@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
373	\N	24BCADS146	\N	\N	\N	Aditi Nair	\N	\N	\N	aditi.nair146@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
374	\N	24BCADS147	\N	\N	\N	Sneha Chauhan	\N	\N	\N	sneha.chauhan147@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
375	\N	24BCADS148	\N	\N	\N	Aditya Singh	\N	\N	\N	aditya.singh148@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
376	\N	24BCADS149	\N	\N	\N	Pooja Singh	\N	\N	\N	pooja.singh149@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
377	\N	24BCADS150	\N	\N	\N	Neha Reddy	\N	\N	\N	neha.reddy150@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
378	\N	24BCADS151	\N	\N	\N	Karan Singh	\N	\N	\N	karan.singh151@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
379	\N	24BCADS152	\N	\N	\N	Meera Gupta	\N	\N	\N	meera.gupta152@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
380	\N	24BCADS153	\N	\N	\N	Aarav Iyer	\N	\N	\N	aarav.iyer153@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
381	\N	24BCADS154	\N	\N	\N	Ishaan Mishra	\N	\N	\N	ishaan.mishra154@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
382	\N	24BCADS155	\N	\N	\N	Pooja Verma	\N	\N	\N	pooja.verma155@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
383	\N	24BCADS156	\N	\N	\N	Vivaan Patel	\N	\N	\N	vivaan.patel156@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
384	\N	24BCADS157	\N	\N	\N	Tanvi Pandya	\N	\N	\N	tanvi.pandya157@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
385	\N	24BCADS158	\N	\N	\N	Pooja Chauhan	\N	\N	\N	pooja.chauhan158@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
386	\N	24BCADS159	\N	\N	\N	Yash Mehta	\N	\N	\N	yash.mehta159@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
387	\N	24BCADS160	\N	\N	\N	Dev Mishra	\N	\N	\N	dev.mishra160@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
388	\N	24BCADS161	\N	\N	\N	Neha Chauhan	\N	\N	\N	neha.chauhan161@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
389	\N	24BCADS162	\N	\N	\N	Sai Pandya	\N	\N	\N	sai.pandya162@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
390	\N	24BCADS163	\N	\N	\N	Rohan Gupta	\N	\N	\N	rohan.gupta163@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
391	\N	24BCADS164	\N	\N	\N	Rohan Singh	\N	\N	\N	rohan.singh164@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
392	\N	24BCADS165	\N	\N	\N	Diya Gupta	\N	\N	\N	diya.gupta165@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
393	\N	24BCADS166	\N	\N	\N	Rahul Desai	\N	\N	\N	rahul.desai166@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
394	\N	24BCADS167	\N	\N	\N	Sneha Kapoor	\N	\N	\N	sneha.kapoor167@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
396	\N	24BCADS169	\N	\N	\N	Krishna Joshi	\N	\N	\N	krishna.joshi169@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
397	\N	24BCADS170	\N	\N	\N	Harsh Joshi	\N	\N	\N	harsh.joshi170@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
395	\N	24BCADS168	\N	\N	\N	Bhushan Wagh	\N	\N	\N	24bcads168@vtcbcsr.edu.in	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	\N	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
362	\N	24BCADS135	\N	\N	\N	Aarav Kulkarni	2026-05-27	male	AB-	24bcads135@vtcbcsr.edu.in	9316765587	9855465412	\N	\N	\N	\N	2	Open	GSEB	85.00	Science	JB	\N	fresh	5	5	8	24BCADS2	incomplete	$2b$10$xRDSnUgIXzy.gq0tiwC4IOg/dVlga.D6SfxSeqbMn8w0NAy32QWee	\N	2026-05-11 11:01:56.022272	4	incomplete	{"current": {"city": "Vyara", "kind": "home", "line1": "singi vyara", "pincode": "394650"}}
315	\N	24BCADS088	\N	\N	\N	Dev Kapoor	\N	\N	\N	dev.kapoor88@example.com	\N	\N	\N	\N	\N	\N	2	\N	\N	\N	\N	\N	\N	fresh	5	5	8	24BCADS2	incomplete	$2b$10$FeNHHHHZ0yakmDDlfXtY5eSd5GBn0On.b1oZgX9CsKJzim8d.paqa	\N	2026-05-11 11:01:56.022272	1	incomplete	\N
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subjects (id, name, code, subject_type, internal_theory_max, external_theory_max, theory_passing_marks, internal_practical_max, external_practical_max, practical_passing_marks, created_at, short_code, credit, semester, course_id) FROM stdin;
12	TABLUE	501-4	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:01.978569	TABLUE	4	5	2
13	Big Data	502-4	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:02.126073	BIG DATA	4	5	2
15	Business Analytics	504-4	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:02.400847	BA	4	5	2
16	Deep Learning	505-04	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:02.557963	DL	4	5	2
17	Skill Course	506-04	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:02.700855	SEC	2	5	2
18	Linux OS	501	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:02.838708	LOS	4	5	2
19	Network Technology	502	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:02.981059	NT	4	5	2
20	Ad Web Design	503	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:03.122863	AWD	2	5	2
21	Web Framework and Service	504	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:04.786708	WFAS	2	5	2
22	ASP	505	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:05.807478	ASP	4	5	2
23	Skill Course	506	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:06.981106	SEC	2	5	2
24	Modern Indian Language	301	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:08.602688	MIL	2	3	2
25	Statastical Methods	302	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:10.196442	SM	4	3	2
26	Stat Using R	302-4	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:12.132543	SUR	4	3	2
27	OOP and DS	303	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:14.946038	OOP	4	3	2
28	Adv Worksheet	303-4	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:16.528055	ADW	4	3	2
29	fundamental ML	303-7	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:17.800612	FML	4	3	2
30	Data Using Python	304	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:19.032788	DUP	4	3	2
31	Exploratory Data Analysis	304-4	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:19.610648	EDA	4	3	2
32	AI OOP	304-7	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:20.487739	AI OPP	4	3	2
33	Web Design	305	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:21.296144	WD1	4	3	2
34	Skill Course	306	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:21.998532	SEC	2	3	2
35	Value Addition Course	307	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:22.265974	VAC	2	3	2
36	Comunication Skills	101	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:22.392644	CS	2	1	2
37	Maths	102	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:22.506201	MATHS	4	1	2
38	Intro Computer	103	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:22.628055	IC	4	1	2
39	fundamental computer	103-4	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:22.755868	FC	4	1	2
40	Intro to AI	103-8	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:22.867631	ITAI	4	1	2
41	CPPM	104	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:22.996405	CPPM	4	1	2
42	DPAR	105	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:23.112744	DPAR	4	1	2
43	BDS	105-4	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:23.275978	BDS	4	1	2
44	DPAA	105-7	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:23.412848	DPAA	4	1	2
45	Skill Course	106	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:23.536399	SEC	2	1	2
46	Value Addition Course	107	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:23.662571	VAC	2	1	2
47	Version Controll	701	theory	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:23.795852	VC	4	7	2
48	Web Design	702	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:23.912916	WD	4	7	2
49	Tablue	703	both	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:24.040755	TABLU	4	7	2
14	ML Algo	503-4	project_minor	\N	\N	\N	\N	\N	\N	2026-05-10 06:38:02.257777	ML ALGO	2	5	2
50	C#	704	both	25	25	9	25	25	9	2026-05-21 06:08:09.649871	\N	\N	\N	2
51	Quiz	QUIZ	theory	\N	\N	\N	\N	\N	\N	2026-05-21 06:10:05.372999	\N	\N	\N	2
\.


--
-- Data for Name: timetable_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.timetable_entries (id, semester_id, division_id, assignment_id, day_of_week, start_time, end_time, color, is_lab, lab_id, is_active, publish_id, created_at, slot_id) FROM stdin;
1575	4	7	380	Monday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1576	4	7	380	Monday	09:50:00	10:40:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1577	4	7	380	Monday	10:40:00	11:30:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1578	4	7	380	Wednesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1579	4	7	380	Friday	07:50:00	08:50:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1580	4	7	381	Monday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1581	4	7	381	Tuesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1582	4	7	381	Thursday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1583	4	7	381	Saturday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1584	4	7	382	Monday	11:30:00	12:20:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1585	4	7	382	Wednesday	11:30:00	12:20:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1586	4	7	382	Thursday	07:50:00	08:50:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1587	4	7	382	Thursday	08:50:00	09:40:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1588	4	7	383	Tuesday	07:50:00	08:50:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1589	4	7	383	Tuesday	08:50:00	09:40:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1590	4	7	383	Wednesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1591	4	7	383	Wednesday	10:40:00	11:30:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1592	4	7	383	Friday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1593	4	7	384	Tuesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1594	4	7	384	Saturday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1595	4	7	385	Wednesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1596	4	7	385	Friday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1597	4	7	386	Saturday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1598	4	8	387	Monday	07:50:00	08:50:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1599	4	8	387	Monday	08:50:00	09:40:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1600	4	8	387	Wednesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1601	4	8	387	Thursday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1602	4	8	387	Thursday	11:30:00	12:20:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1603	4	8	388	Monday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1604	4	8	388	Wednesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1605	4	8	388	Thursday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1606	4	8	388	Friday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1607	4	8	389	Tuesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1608	4	8	389	Tuesday	09:50:00	10:40:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1609	4	8	389	Tuesday	10:40:00	11:30:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1610	4	8	389	Wednesday	11:30:00	12:20:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1611	4	8	389	Thursday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1612	4	8	390	Tuesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1613	4	8	390	Friday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1614	4	8	390	Saturday	07:50:00	08:50:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1615	4	8	390	Saturday	08:50:00	09:40:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1616	4	8	391	Wednesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1617	4	8	391	Thursday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1618	4	8	391	Friday	09:50:00	10:40:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1619	4	8	391	Friday	10:40:00	11:30:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1620	4	8	392	Wednesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1621	4	8	392	Saturday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1622	4	8	393	Saturday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1623	4	9	394	Monday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1624	4	9	394	Tuesday	11:30:00	12:20:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1625	4	9	394	Wednesday	07:50:00	08:50:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1626	4	9	394	Wednesday	08:50:00	09:40:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1627	4	9	394	Wednesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1628	4	9	395	Monday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1629	4	9	395	Thursday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1630	4	9	396	Monday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1631	4	9	396	Tuesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1632	4	9	396	Thursday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1633	4	9	396	Saturday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1634	4	9	397	Monday	10:40:00	11:30:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1635	4	9	397	Tuesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1636	4	9	397	Thursday	11:30:00	12:20:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1637	4	9	398	Tuesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1638	4	9	398	Thursday	09:50:00	10:40:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1639	4	9	398	Thursday	10:40:00	11:30:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1640	4	9	398	Friday	08:50:00	09:40:00	#6366f1	t	LAB-3	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1641	4	9	398	Saturday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1642	4	9	399	Tuesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1643	4	9	399	Wednesday	10:40:00	11:30:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1644	4	9	399	Friday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1645	4	9	400	Saturday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1646	4	10	401	Monday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1647	4	10	401	Saturday	08:50:00	09:40:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1648	4	10	401	Saturday	09:50:00	10:40:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1649	4	10	402	Monday	08:50:00	09:40:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1650	4	10	402	Wednesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1651	4	10	402	Thursday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1652	4	10	402	Friday	09:50:00	10:40:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1653	4	10	402	Friday	10:40:00	11:30:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1654	4	10	403	Monday	09:50:00	10:40:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1655	4	10	403	Monday	10:40:00	11:30:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1656	4	10	403	Tuesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1657	4	10	403	Tuesday	11:30:00	12:20:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1658	4	10	403	Friday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1659	4	10	404	Tuesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1660	4	10	404	Thursday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1661	4	10	404	Thursday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1662	4	10	404	Friday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1663	4	10	405	Tuesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1664	4	10	405	Wednesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1665	4	10	406	Wednesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1666	4	10	406	Saturday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1667	4	10	407	Saturday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1668	5	11	408	Monday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1669	5	11	408	Tuesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1670	5	11	408	Wednesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1671	5	11	408	Friday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1672	5	11	409	Monday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1673	5	11	409	Friday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1674	5	11	410	Monday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1675	5	11	410	Monday	11:30:00	12:20:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1676	5	11	410	Wednesday	07:50:00	08:50:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1677	5	11	410	Wednesday	08:50:00	09:40:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1678	5	11	410	Friday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1679	5	11	411	Monday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1680	5	11	411	Wednesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1681	5	11	411	Thursday	07:50:00	08:50:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1682	5	11	411	Thursday	08:50:00	09:40:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1683	5	11	411	Friday	11:30:00	12:20:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1684	5	11	412	Tuesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1685	5	11	412	Tuesday	09:50:00	10:40:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1686	5	11	412	Tuesday	10:40:00	11:30:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1687	5	11	412	Friday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1688	5	11	412	Saturday	07:50:00	08:50:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1689	5	11	412	Saturday	08:50:00	09:40:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1690	5	11	413	Thursday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1691	5	11	414	Saturday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1692	5	12	415	Monday	07:50:00	08:50:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1693	5	12	415	Monday	08:50:00	09:40:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1694	5	12	415	Friday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1695	5	12	415	Saturday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1696	5	12	415	Saturday	09:50:00	10:40:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1697	5	12	416	Monday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1698	5	12	416	Tuesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1699	5	12	416	Wednesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1700	5	12	416	Thursday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1701	5	12	417	Tuesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1702	5	12	417	Wednesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1703	5	12	418	Tuesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1704	5	12	418	Wednesday	11:30:00	12:20:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1705	5	12	418	Thursday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1706	5	12	418	Friday	09:50:00	10:40:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1707	5	12	418	Friday	10:40:00	11:30:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1708	5	12	419	Tuesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1709	5	12	419	Wednesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1710	5	12	419	Friday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1711	5	12	420	Tuesday	11:30:00	12:20:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1712	5	12	420	Wednesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1713	5	12	420	Thursday	09:50:00	10:40:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1714	5	12	420	Thursday	10:40:00	11:30:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1715	5	12	420	Saturday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1716	5	12	421	Saturday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1717	5	13	422	Monday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1718	5	13	422	Tuesday	07:50:00	08:50:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1719	5	13	422	Tuesday	08:50:00	09:40:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1720	5	13	422	Wednesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1721	5	13	422	Thursday	11:30:00	12:20:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1722	5	13	423	Monday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1723	5	13	423	Monday	09:50:00	10:40:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1724	5	13	423	Monday	10:40:00	11:30:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1725	5	13	423	Thursday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1726	5	13	423	Saturday	09:50:00	10:40:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1727	5	13	424	Tuesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1728	5	13	424	Thursday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1729	5	13	424	Friday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1730	5	13	424	Saturday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1731	5	13	425	Wednesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1732	5	13	425	Wednesday	09:50:00	10:40:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1733	5	13	425	Wednesday	10:40:00	11:30:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1734	5	13	425	Friday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1735	5	13	425	Friday	11:30:00	12:20:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1736	5	13	426	Thursday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1737	5	13	426	Friday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1738	5	13	427	Friday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1739	5	13	427	Saturday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1740	5	13	428	Saturday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1741	5	14	429	Monday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1742	5	14	429	Tuesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1743	5	14	429	Tuesday	11:30:00	12:20:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1744	5	14	429	Friday	07:50:00	08:50:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1745	5	14	429	Friday	08:50:00	09:40:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1746	5	14	430	Monday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1747	5	14	430	Tuesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1748	5	14	431	Monday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1749	5	14	431	Wednesday	07:50:00	08:50:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1750	5	14	431	Wednesday	08:50:00	09:40:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1751	5	14	431	Saturday	07:50:00	08:50:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1752	5	14	431	Saturday	08:50:00	09:40:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1753	5	14	432	Monday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1754	5	14	432	Tuesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1755	5	14	432	Wednesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1756	5	14	432	Thursday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1757	5	14	433	Monday	11:30:00	12:20:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1758	5	14	433	Tuesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1759	5	14	433	Thursday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1760	5	14	433	Thursday	09:50:00	10:40:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1761	5	14	433	Thursday	10:40:00	11:30:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1762	5	14	434	Wednesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1763	5	14	434	Friday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1764	5	14	435	Saturday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1765	5	15	436	Monday	07:50:00	08:50:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1766	5	15	436	Monday	08:50:00	09:40:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1767	5	15	436	Monday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1768	5	15	436	Thursday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1769	5	15	436	Friday	09:50:00	10:40:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1770	5	15	437	Monday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1771	5	15	437	Tuesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1772	5	15	437	Wednesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1773	5	15	437	Friday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1774	5	15	438	Tuesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1775	5	15	438	Tuesday	09:50:00	10:40:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1776	5	15	438	Tuesday	10:40:00	11:30:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1777	5	15	438	Friday	11:30:00	12:20:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1778	5	15	438	Saturday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1779	5	15	439	Wednesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1780	5	15	439	Wednesday	11:30:00	12:20:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1781	5	15	439	Thursday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1782	5	15	439	Thursday	09:50:00	10:40:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1783	5	15	439	Thursday	10:40:00	11:30:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1784	5	15	440	Wednesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1785	5	15	440	Saturday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1786	5	15	441	Friday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1787	5	15	441	Friday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1788	5	15	442	Saturday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1789	1	16	443	Monday	07:50:00	08:50:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1790	1	16	443	Monday	08:50:00	09:40:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1791	1	16	443	Wednesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1792	1	16	443	Friday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1793	1	16	443	Friday	10:40:00	11:30:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1794	1	16	444	Monday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1795	1	16	444	Tuesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1796	1	16	444	Wednesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1797	1	16	444	Saturday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1798	1	16	445	Monday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1799	1	16	445	Friday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1800	1	16	446	Tuesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1801	1	16	446	Saturday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1802	1	16	447	Tuesday	09:50:00	10:40:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1803	1	16	447	Thursday	07:50:00	08:50:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1804	1	16	447	Thursday	08:50:00	09:40:00	#6366f1	t	LAB-1	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1805	1	16	447	Thursday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1806	1	16	447	Friday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1807	1	16	448	Tuesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1808	1	16	448	Wednesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1809	1	16	448	Friday	11:30:00	12:20:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1810	1	16	448	Saturday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1811	1	16	449	Saturday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1812	1	17	450	Monday	07:50:00	08:50:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1813	1	17	450	Wednesday	09:50:00	10:40:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1814	1	17	450	Wednesday	10:40:00	11:30:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1815	1	17	450	Thursday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1816	1	17	450	Friday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1817	1	17	451	Monday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1818	1	17	451	Wednesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1819	1	17	451	Friday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1820	1	17	451	Saturday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1821	1	17	452	Monday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1822	1	17	452	Tuesday	09:50:00	10:40:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1823	1	17	452	Thursday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1824	1	17	452	Friday	07:50:00	08:50:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1825	1	17	452	Friday	08:50:00	09:40:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1826	1	17	453	Tuesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1827	1	17	453	Wednesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1828	1	17	453	Thursday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1829	1	17	453	Saturday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1830	1	17	454	Tuesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1831	1	17	454	Saturday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1832	1	17	455	Thursday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1833	1	17	456	Saturday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1834	1	18	457	Monday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1835	1	18	457	Tuesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1836	1	18	457	Wednesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1837	1	18	457	Friday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1838	1	18	458	Monday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1839	1	18	458	Wednesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1840	1	18	458	Thursday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1841	1	18	458	Friday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1842	1	18	459	Monday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1843	1	18	459	Tuesday	07:50:00	08:50:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1844	1	18	459	Tuesday	08:50:00	09:40:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1845	1	18	459	Tuesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1846	1	18	459	Friday	07:50:00	08:50:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1847	1	18	460	Monday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1848	1	18	460	Wednesday	09:50:00	10:40:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1849	1	18	460	Wednesday	10:40:00	11:30:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1850	1	18	460	Thursday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1851	1	18	460	Saturday	07:50:00	08:50:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1852	1	18	460	Saturday	08:50:00	09:40:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1853	1	18	461	Monday	11:30:00	12:20:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1854	1	18	462	Thursday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1855	1	18	462	Saturday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1856	1	18	463	Saturday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1857	1	19	464	Monday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1858	1	19	464	Tuesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1859	1	19	464	Wednesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1860	1	19	464	Friday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1861	1	19	465	Monday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1862	1	19	465	Tuesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1863	1	19	465	Wednesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1864	1	19	465	Thursday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1865	1	19	466	Monday	09:50:00	10:40:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1866	1	19	466	Monday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1867	1	19	466	Wednesday	07:50:00	08:50:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1868	1	19	466	Wednesday	08:50:00	09:40:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1869	1	19	466	Thursday	11:30:00	12:20:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1870	1	19	467	Tuesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1871	1	19	467	Wednesday	11:30:00	12:20:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1872	1	19	467	Thursday	07:50:00	08:50:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1873	1	19	467	Thursday	08:50:00	09:40:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1874	1	19	467	Friday	09:50:00	10:40:00	#6366f1	t	LAB-5	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1875	1	19	468	Thursday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1876	1	19	468	Saturday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1877	1	19	469	Friday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1878	1	19	469	Saturday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1879	1	19	470	Saturday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1880	1	20	471	Monday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1881	1	20	471	Tuesday	07:50:00	08:50:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1882	1	20	471	Tuesday	08:50:00	09:40:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1883	1	20	471	Wednesday	09:50:00	10:40:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1884	1	20	471	Friday	11:30:00	12:20:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1885	1	20	471	Saturday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1886	1	20	472	Monday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1887	1	20	472	Tuesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1888	1	20	472	Wednesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1889	1	20	472	Friday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1890	1	20	473	Monday	09:50:00	10:40:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1891	1	20	473	Thursday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1892	1	20	473	Friday	07:50:00	08:50:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1893	1	20	473	Friday	08:50:00	09:40:00	#6366f1	t	LAB-2	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1894	1	20	474	Monday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1895	1	20	474	Thursday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1896	1	20	475	Tuesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1897	1	20	475	Wednesday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1898	1	20	475	Thursday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1899	1	20	475	Saturday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1900	1	20	476	Tuesday	11:30:00	12:20:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	18
1901	1	20	476	Friday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1902	1	20	477	Saturday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1903	6	21	478	Monday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1904	6	21	478	Tuesday	08:50:00	09:40:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1905	6	21	478	Wednesday	08:50:00	09:40:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1906	6	21	478	Wednesday	10:40:00	11:30:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1907	6	21	478	Saturday	07:50:00	08:50:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1908	6	21	479	Monday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1909	6	21	479	Wednesday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1910	6	21	479	Thursday	07:50:00	08:50:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1911	6	21	479	Friday	08:50:00	09:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1912	6	21	480	Tuesday	07:50:00	08:50:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	13
1913	6	21	480	Tuesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1914	6	21	480	Thursday	08:50:00	09:40:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	14
1915	6	21	481	Tuesday	10:40:00	11:30:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
1916	6	21	481	Wednesday	09:50:00	10:40:00	#6366f1	f	\N	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1917	6	21	481	Thursday	09:50:00	10:40:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	16
1918	6	21	481	Thursday	10:40:00	11:30:00	#6366f1	t	LAB-4	t	pub_1779706472158	2026-05-25 10:54:35.098781	17
\.


--
-- Data for Name: timetable_slots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.timetable_slots (id, slot_number, label, start_time, end_time, is_break, created_at) FROM stdin;
13	1	Slot 1	07:50:00	08:50:00	f	2026-05-25 10:53:35.369287
14	2	Slot 2	08:50:00	09:40:00	f	2026-05-25 10:53:35.369287
15	3	Break	09:40:00	09:50:00	t	2026-05-25 10:53:35.369287
16	4	Slot 3	09:50:00	10:40:00	f	2026-05-25 10:53:35.369287
17	5	Slot 4	10:40:00	11:30:00	f	2026-05-25 10:53:35.369287
18	6	Slot 5	11:30:00	12:20:00	f	2026-05-25 10:53:35.369287
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-05-10 11:41:47
20211116045059	2026-05-10 11:41:48
20211116050929	2026-05-10 11:41:49
20211116051442	2026-05-10 11:41:49
20211116212300	2026-05-10 11:41:50
20211116213355	2026-05-10 11:41:51
20211116213934	2026-05-10 11:41:51
20211116214523	2026-05-10 11:41:52
20211122062447	2026-05-10 11:41:53
20211124070109	2026-05-10 11:41:53
20211202204204	2026-05-10 11:41:54
20211202204605	2026-05-10 11:41:55
20211210212804	2026-05-10 11:41:57
20211228014915	2026-05-10 11:41:57
20220107221237	2026-05-10 11:41:58
20220228202821	2026-05-10 11:41:59
20220312004840	2026-05-10 11:41:59
20220603231003	2026-05-10 11:42:00
20220603232444	2026-05-10 11:42:01
20220615214548	2026-05-10 11:42:02
20220712093339	2026-05-10 11:42:02
20220908172859	2026-05-10 11:42:03
20220916233421	2026-05-10 11:42:03
20230119133233	2026-05-10 11:42:04
20230128025114	2026-05-10 11:42:05
20230128025212	2026-05-10 11:42:05
20230227211149	2026-05-10 11:42:06
20230228184745	2026-05-10 11:42:07
20230308225145	2026-05-10 11:42:07
20230328144023	2026-05-10 11:42:08
20231018144023	2026-05-10 11:42:09
20231204144023	2026-05-10 11:42:10
20231204144024	2026-05-10 11:42:10
20231204144025	2026-05-10 11:42:11
20240108234812	2026-05-10 11:42:11
20240109165339	2026-05-10 11:42:12
20240227174441	2026-05-10 11:42:13
20240311171622	2026-05-10 11:42:14
20240321100241	2026-05-10 11:42:15
20240401105812	2026-05-10 11:42:17
20240418121054	2026-05-10 11:42:18
20240523004032	2026-05-10 11:42:20
20240618124746	2026-05-10 11:42:21
20240801235015	2026-05-10 11:42:21
20240805133720	2026-05-10 11:42:22
20240827160934	2026-05-10 11:42:23
20240919163303	2026-05-10 11:42:24
20240919163305	2026-05-10 11:42:24
20241019105805	2026-05-10 11:42:25
20241030150047	2026-05-10 11:42:27
20241108114728	2026-05-10 11:42:28
20241121104152	2026-05-10 11:42:29
20241130184212	2026-05-10 11:42:29
20241220035512	2026-05-10 11:42:30
20241220123912	2026-05-10 11:42:31
20241224161212	2026-05-10 11:42:31
20250107150512	2026-05-10 11:42:32
20250110162412	2026-05-10 11:42:32
20250123174212	2026-05-10 11:42:33
20250128220012	2026-05-10 11:42:34
20250506224012	2026-05-10 11:42:34
20250523164012	2026-05-10 11:42:35
20250714121412	2026-05-10 11:42:35
20250905041441	2026-05-10 11:42:36
20251103001201	2026-05-10 11:42:37
20251120212548	2026-05-10 11:42:37
20251120215549	2026-05-10 11:42:38
20260218120000	2026-05-10 11:42:39
20260326120000	2026-05-10 11:42:39
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-05-10 09:04:23.264062
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-05-10 09:04:23.375663
2	storage-schema	f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd	2026-05-10 09:04:23.378209
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-05-10 09:04:23.400078
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-05-10 09:04:23.412962
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-05-10 09:04:23.415646
6	change-column-name-in-get-size	ded78e2f1b5d7e616117897e6443a925965b30d2	2026-05-10 09:04:23.418844
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-05-10 09:04:23.422228
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-05-10 09:04:23.426446
9	fix-search-function	af597a1b590c70519b464a4ab3be54490712796b	2026-05-10 09:04:23.431423
10	search-files-search-function	b595f05e92f7e91211af1bbfe9c6a13bb3391e16	2026-05-10 09:04:23.434416
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-05-10 09:04:23.43757
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-05-10 09:04:23.440931
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-05-10 09:04:23.444029
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-05-10 09:04:23.447045
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-05-10 09:04:23.479666
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-05-10 09:04:23.4826
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-05-10 09:04:23.485318
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-05-10 09:04:23.488031
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-05-10 09:04:23.492344
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-05-10 09:04:23.495432
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-05-10 09:04:23.501308
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-05-10 09:04:23.517593
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-05-10 09:04:23.525923
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-05-10 09:04:23.528701
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-05-10 09:04:23.532049
26	objects-prefixes	215cabcb7f78121892a5a2037a09fedf9a1ae322	2026-05-10 09:04:23.535084
27	search-v2	859ba38092ac96eb3964d83bf53ccc0b141663a6	2026-05-10 09:04:23.537992
28	object-bucket-name-sorting	c73a2b5b5d4041e39705814fd3a1b95502d38ce4	2026-05-10 09:04:23.540347
29	create-prefixes	ad2c1207f76703d11a9f9007f821620017a66c21	2026-05-10 09:04:23.542744
30	update-object-levels	2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6	2026-05-10 09:04:23.545072
31	objects-level-index	b40367c14c3440ec75f19bbce2d71e914ddd3da0	2026-05-10 09:04:23.547871
32	backward-compatible-index-on-objects	e0c37182b0f7aee3efd823298fb3c76f1042c0f7	2026-05-10 09:04:23.550432
33	backward-compatible-index-on-prefixes	b480e99ed951e0900f033ec4eb34b5bdcb4e3d49	2026-05-10 09:04:23.553062
34	optimize-search-function-v1	ca80a3dc7bfef894df17108785ce29a7fc8ee456	2026-05-10 09:04:23.555357
35	add-insert-trigger-prefixes	458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc	2026-05-10 09:04:23.557784
36	optimise-existing-functions	6ae5fca6af5c55abe95369cd4f93985d1814ca8f	2026-05-10 09:04:23.560089
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-05-10 09:04:23.562395
38	iceberg-catalog-flag-on-buckets	02716b81ceec9705aed84aa1501657095b32e5c5	2026-05-10 09:04:23.565697
39	add-search-v2-sort-support	6706c5f2928846abee18461279799ad12b279b78	2026-05-10 09:04:23.574851
40	fix-prefix-race-conditions-optimized	7ad69982ae2d372b21f48fc4829ae9752c518f6b	2026-05-10 09:04:23.577068
41	add-object-level-update-trigger	07fcf1a22165849b7a029deed059ffcde08d1ae0	2026-05-10 09:04:23.579836
42	rollback-prefix-triggers	771479077764adc09e2ea2043eb627503c034cd4	2026-05-10 09:04:23.582204
43	fix-object-level	84b35d6caca9d937478ad8a797491f38b8c2979f	2026-05-10 09:04:23.584468
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-05-10 09:04:23.587348
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-05-10 09:04:23.590735
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-05-10 09:04:23.599226
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-05-10 09:04:23.602065
48	iceberg-catalog-ids	e0e8b460c609b9999ccd0df9ad14294613eed939	2026-05-10 09:04:23.604494
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-05-10 09:04:23.618162
50	search-v2-optimised	6323ac4f850aa14e7387eb32102869578b5bd478	2026-05-10 09:04:23.62158
51	index-backward-compatible-search	2ee395d433f76e38bcd3856debaf6e0e5b674011	2026-05-10 09:04:23.63745
52	drop-not-used-indexes-and-functions	5cc44c8696749ac11dd0dc37f2a3802075f3a171	2026-05-10 09:04:23.63897
53	drop-index-lower-name	d0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854	2026-05-10 09:04:23.651604
54	drop-index-object-level	6289e048b1472da17c31a7eba1ded625a6457e67	2026-05-10 09:04:23.654287
55	prevent-direct-deletes	262a4798d5e0f2e7c8970232e03ce8be695d5819	2026-05-10 09:04:23.655827
56	fix-optimized-search-function	b823ed1e418101032fa01374edc9a436e54e3ed4	2026-05-10 09:04:23.659426
57	s3-multipart-uploads-metadata	f127886e00d1b374fadbc7c6b31e09336aad5287	2026-05-10 09:04:23.663327
58	operation-ergonomics	00ca5d483b3fe0d522133d9002ccc5df98365120	2026-05-10 09:04:23.666149
59	drop-unused-functions	38456f13e39691c2bbb4b5151d0d1cdbabd4a8c4	2026-05-10 09:04:23.669341
60	optimize-existing-functions-again	db35e1c91a9201e59f4fef8d972c2f277d68b157	2026-05-10 09:04:23.671996
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata, metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 1, false);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: postgres
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, false);


--
-- Name: academic_years_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.academic_years_id_seq', 1, true);


--
-- Name: administrators_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.administrators_id_seq', 2, true);


--
-- Name: attendance_session_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_session_ledger_id_seq', 30, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: circular_recipients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.circular_recipients_id_seq', 2, true);


--
-- Name: circulars_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.circulars_id_seq', 17, true);


--
-- Name: classroom_benches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classroom_benches_id_seq', 234, true);


--
-- Name: classrooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classrooms_id_seq', 20, true);


--
-- Name: counselor_division_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.counselor_division_assignments_id_seq', 6, true);


--
-- Name: courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.courses_id_seq', 3, true);


--
-- Name: divisions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.divisions_id_seq', 21, true);


--
-- Name: exam_eligibility_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exam_eligibility_rules_id_seq', 2, true);


--
-- Name: exam_hall_allocations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exam_hall_allocations_id_seq', 1, false);


--
-- Name: exam_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exam_schedules_id_seq', 1, false);


--
-- Name: exam_scopes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exam_scopes_id_seq', 10, true);


--
-- Name: exam_subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exam_subjects_id_seq', 1, false);


--
-- Name: faculty_approval_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.faculty_approval_configs_id_seq', 2, true);


--
-- Name: faculty_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.faculty_id_seq', 31, true);


--
-- Name: faculty_request_approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.faculty_request_approvals_id_seq', 12, true);


--
-- Name: faculty_request_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.faculty_request_documents_id_seq', 1, false);


--
-- Name: faculty_request_proxies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.faculty_request_proxies_id_seq', 20, true);


--
-- Name: faculty_request_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.faculty_request_types_id_seq', 2, true);


--
-- Name: faculty_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.faculty_requests_id_seq', 6, true);


--
-- Name: faculty_subject_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.faculty_subject_assignments_id_seq', 481, true);


--
-- Name: internal_evaluations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.internal_evaluations_id_seq', 1, false);


--
-- Name: internal_exam_marks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.internal_exam_marks_id_seq', 650, true);


--
-- Name: internal_exams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.internal_exams_id_seq', 3, true);


--
-- Name: marks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.marks_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 6, true);


--
-- Name: rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rooms_id_seq', 25, true);


--
-- Name: semesters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.semesters_id_seq', 6, true);


--
-- Name: student_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_documents_id_seq', 15, true);


--
-- Name: student_enrollment_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_enrollment_history_id_seq', 91, true);


--
-- Name: student_prior_education_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_prior_education_id_seq', 1, false);


--
-- Name: student_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_requests_id_seq', 14, true);


--
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.students_id_seq', 397, true);


--
-- Name: subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subjects_id_seq', 51, true);


--
-- Name: timetable_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.timetable_entries_id_seq', 1918, true);


--
-- Name: timetable_slots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.timetable_slots_id_seq', 18, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: supabase_admin
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: academic_years academic_years_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_name_unique UNIQUE (name);


--
-- Name: academic_years academic_years_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_pkey PRIMARY KEY (id);


--
-- Name: administrators administrators_admin_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administrators
    ADD CONSTRAINT administrators_admin_code_key UNIQUE (admin_code);


--
-- Name: administrators administrators_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administrators
    ADD CONSTRAINT administrators_email_key UNIQUE (email);


--
-- Name: administrators administrators_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administrators
    ADD CONSTRAINT administrators_pkey PRIMARY KEY (id);


--
-- Name: attendance_analytics_summary attendance_analytics_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_analytics_summary
    ADD CONSTRAINT attendance_analytics_summary_pkey PRIMARY KEY (student_id, division_id, semester_id);


--
-- Name: attendance_session_ledger attendance_session_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_session_ledger
    ADD CONSTRAINT attendance_session_ledger_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: circular_recipients circular_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.circular_recipients
    ADD CONSTRAINT circular_recipients_pkey PRIMARY KEY (id);


--
-- Name: circulars circulars_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.circulars
    ADD CONSTRAINT circulars_pkey PRIMARY KEY (id);


--
-- Name: circulars circulars_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.circulars
    ADD CONSTRAINT circulars_slug_unique UNIQUE (slug);


--
-- Name: classroom_benches classroom_benches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_benches
    ADD CONSTRAINT classroom_benches_pkey PRIMARY KEY (id);


--
-- Name: classrooms classrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_pkey PRIMARY KEY (id);


--
-- Name: classrooms classrooms_room_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_room_code_key UNIQUE (room_code);


--
-- Name: counselor_division_assignments counselor_division_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.counselor_division_assignments
    ADD CONSTRAINT counselor_division_assignments_pkey PRIMARY KEY (id);


--
-- Name: courses courses_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_code_unique UNIQUE (code);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: divisions divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_pkey PRIMARY KEY (id);


--
-- Name: exam_eligibility_rules exam_eligibility_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_eligibility_rules
    ADD CONSTRAINT exam_eligibility_rules_pkey PRIMARY KEY (id);


--
-- Name: exam_hall_allocations exam_hall_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_hall_allocations
    ADD CONSTRAINT exam_hall_allocations_pkey PRIMARY KEY (id);


--
-- Name: exam_schedules exam_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_pkey PRIMARY KEY (id);


--
-- Name: exam_scopes exam_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_scopes
    ADD CONSTRAINT exam_scopes_pkey PRIMARY KEY (id);


--
-- Name: exam_subjects exam_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_subjects
    ADD CONSTRAINT exam_subjects_pkey PRIMARY KEY (id);


--
-- Name: faculty_approval_configs faculty_approval_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_approval_configs
    ADD CONSTRAINT faculty_approval_configs_pkey PRIMARY KEY (id);


--
-- Name: faculty_approval_configs faculty_approval_configs_request_type_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_approval_configs
    ADD CONSTRAINT faculty_approval_configs_request_type_code_key UNIQUE (request_type_code);


--
-- Name: faculty faculty_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_email_unique UNIQUE (email);


--
-- Name: faculty faculty_faculty_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_faculty_code_unique UNIQUE (faculty_code);


--
-- Name: faculty faculty_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_pkey PRIMARY KEY (id);


--
-- Name: faculty_request_approvals faculty_request_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_approvals
    ADD CONSTRAINT faculty_request_approvals_pkey PRIMARY KEY (id);


--
-- Name: faculty_request_documents faculty_request_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_documents
    ADD CONSTRAINT faculty_request_documents_pkey PRIMARY KEY (id);


--
-- Name: faculty_request_proxies faculty_request_proxies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_proxies
    ADD CONSTRAINT faculty_request_proxies_pkey PRIMARY KEY (id);


--
-- Name: faculty_request_types faculty_request_types_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_types
    ADD CONSTRAINT faculty_request_types_code_key UNIQUE (code);


--
-- Name: faculty_request_types faculty_request_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_types
    ADD CONSTRAINT faculty_request_types_pkey PRIMARY KEY (id);


--
-- Name: faculty_requests faculty_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_requests
    ADD CONSTRAINT faculty_requests_pkey PRIMARY KEY (id);


--
-- Name: faculty_roles faculty_roles_faculty_id_role_id_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_roles
    ADD CONSTRAINT faculty_roles_faculty_id_role_id_pk PRIMARY KEY (faculty_id, role_id);


--
-- Name: faculty_subject_assignments faculty_subject_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_subject_assignments
    ADD CONSTRAINT faculty_subject_assignments_pkey PRIMARY KEY (id);


--
-- Name: internal_evaluations internal_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_evaluations
    ADD CONSTRAINT internal_evaluations_pkey PRIMARY KEY (id);


--
-- Name: internal_exam_marks internal_exam_marks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_exam_marks
    ADD CONSTRAINT internal_exam_marks_pkey PRIMARY KEY (id);


--
-- Name: internal_exams internal_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_exams
    ADD CONSTRAINT internal_exams_pkey PRIMARY KEY (id);


--
-- Name: marks marks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marks
    ADD CONSTRAINT marks_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_code_unique UNIQUE (code);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: semesters semesters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semesters
    ADD CONSTRAINT semesters_pkey PRIMARY KEY (id);


--
-- Name: student_documents student_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_pkey PRIMARY KEY (id);


--
-- Name: student_enrollment_history student_enrollment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_enrollment_history
    ADD CONSTRAINT student_enrollment_history_pkey PRIMARY KEY (id);


--
-- Name: student_prior_education student_prior_education_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_prior_education
    ADD CONSTRAINT student_prior_education_pkey PRIMARY KEY (id);


--
-- Name: student_prior_education student_prior_education_student_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_prior_education
    ADD CONSTRAINT student_prior_education_student_id_unique UNIQUE (student_id);


--
-- Name: student_requests student_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_requests
    ADD CONSTRAINT student_requests_pkey PRIMARY KEY (id);


--
-- Name: students students_abc_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_abc_id_unique UNIQUE (abc_id);


--
-- Name: students students_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_email_unique UNIQUE (email);


--
-- Name: students students_enrollment_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_enrollment_id_unique UNIQUE (enrollment_id);


--
-- Name: students students_mobile_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_mobile_unique UNIQUE (mobile);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_spid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_spid_unique UNIQUE (spid);


--
-- Name: students students_student_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_id_unique UNIQUE (student_id);


--
-- Name: students students_temp_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_temp_id_unique UNIQUE (temp_id);


--
-- Name: subjects subjects_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_code_unique UNIQUE (code);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: timetable_entries timetable_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_pkey PRIMARY KEY (id);


--
-- Name: timetable_slots timetable_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT timetable_slots_pkey PRIMARY KEY (id);


--
-- Name: timetable_slots timetable_slots_slot_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT timetable_slots_slot_number_unique UNIQUE (slot_number);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: idx_users_created_at_desc; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_email ON auth.users USING btree (email);


--
-- Name: idx_users_last_sign_in_at_desc; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC);


--
-- Name: idx_users_name; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: aas_div_pct_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX aas_div_pct_idx ON public.attendance_analytics_summary USING btree (division_id, attendance_percentage);


--
-- Name: al_module_entity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX al_module_entity_idx ON public.audit_logs USING btree (module, entity_type, entity_id);


--
-- Name: al_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX al_time_idx ON public.audit_logs USING btree (created_at);


--
-- Name: al_user_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX al_user_time_idx ON public.audit_logs USING btree (user_id, user_type, created_at);


--
-- Name: asl_absent_ids_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX asl_absent_ids_gin_idx ON public.attendance_session_ledger USING gin (absent_student_ids);


--
-- Name: asl_div_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX asl_div_date_idx ON public.attendance_session_ledger USING btree (division_id, date);


--
-- Name: cb_classroom_grid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX cb_classroom_grid_idx ON public.classroom_benches USING btree (classroom_id, grid_x, grid_y);


--
-- Name: cb_classroom_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cb_classroom_idx ON public.classroom_benches USING btree (classroom_id);


--
-- Name: cda_sem_fac_div_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX cda_sem_fac_div_idx ON public.counselor_division_assignments USING btree (semester_id, faculty_id, division_id);


--
-- Name: circ_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX circ_created_idx ON public.circulars USING btree (created_at);


--
-- Name: circ_div_circ_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX circ_div_circ_idx ON public.circular_recipients USING btree (circular_id);


--
-- Name: circ_div_div_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX circ_div_div_idx ON public.circular_recipients USING btree (division_id);


--
-- Name: circ_div_unique_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX circ_div_unique_idx ON public.circular_recipients USING btree (circular_id, division_id);


--
-- Name: circ_faculty_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX circ_faculty_idx ON public.circulars USING btree (faculty_id);


--
-- Name: circ_target_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX circ_target_idx ON public.circulars USING btree (target_type, target_year);


--
-- Name: classrooms_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX classrooms_active_idx ON public.classrooms USING btree (is_active);


--
-- Name: classrooms_course_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX classrooms_course_idx ON public.classrooms USING btree (course_id);


--
-- Name: divisions_batch_divno_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX divisions_batch_divno_idx ON public.divisions USING btree (batch_year, division_no);


--
-- Name: divisions_batch_spec_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX divisions_batch_spec_idx ON public.divisions USING btree (batch_year, specialization);


--
-- Name: eer_exam_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX eer_exam_idx ON public.exam_eligibility_rules USING btree (exam_id);


--
-- Name: eer_exam_year_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX eer_exam_year_idx ON public.exam_eligibility_rules USING btree (exam_id, year_label);


--
-- Name: eha_exam_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX eha_exam_idx ON public.exam_hall_allocations USING btree (exam_id);


--
-- Name: eha_exam_room_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX eha_exam_room_idx ON public.exam_hall_allocations USING btree (exam_id, classroom_id);


--
-- Name: es_exam_div_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX es_exam_div_idx ON public.exam_scopes USING btree (exam_id, division_id);


--
-- Name: es_exam_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX es_exam_idx ON public.exam_scopes USING btree (exam_id);


--
-- Name: esch_exam_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX esch_exam_date_idx ON public.exam_schedules USING btree (exam_id, exam_date);


--
-- Name: esch_exam_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX esch_exam_idx ON public.exam_schedules USING btree (exam_id);


--
-- Name: esch_exam_sub_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX esch_exam_sub_idx ON public.exam_schedules USING btree (exam_id, exam_subject_id);


--
-- Name: esub_exam_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX esub_exam_idx ON public.exam_subjects USING btree (exam_id);


--
-- Name: esub_exam_sub_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX esub_exam_sub_idx ON public.exam_subjects USING btree (exam_id, subject_id);


--
-- Name: fsa_sem_fac_sub_div_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX fsa_sem_fac_sub_div_idx ON public.faculty_subject_assignments USING btree (semester_id, faculty_id, subject_id, division_id);


--
-- Name: ie_sem_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ie_sem_idx ON public.internal_exams USING btree (semester_id);


--
-- Name: ie_sem_num_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ie_sem_num_idx ON public.internal_exams USING btree (semester_id, exam_number);


--
-- Name: ie_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ie_status_idx ON public.internal_exams USING btree (status);


--
-- Name: iem_assign_exam_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX iem_assign_exam_idx ON public.internal_exam_marks USING btree (assignment_id, internal_exam_id);


--
-- Name: iem_exam_assign_student_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX iem_exam_assign_student_idx ON public.internal_exam_marks USING btree (internal_exam_id, assignment_id, student_id);


--
-- Name: iem_student_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX iem_student_idx ON public.internal_exam_marks USING btree (student_id);


--
-- Name: iev_assign_sem_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX iev_assign_sem_idx ON public.internal_evaluations USING btree (assignment_id, semester_id);


--
-- Name: iev_assign_student_sem_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX iev_assign_student_sem_idx ON public.internal_evaluations USING btree (assignment_id, student_id, semester_id);


--
-- Name: marks_assign_sem_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX marks_assign_sem_idx ON public.marks USING btree (assignment_id, semester_id);


--
-- Name: marks_student_assign_sem_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX marks_student_assign_sem_idx ON public.marks USING btree (student_id, assignment_id, semester_id);


--
-- Name: seh_division_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX seh_division_idx ON public.student_enrollment_history USING btree (division_id);


--
-- Name: seh_student_semester_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX seh_student_semester_idx ON public.student_enrollment_history USING btree (student_id, semester_id);


--
-- Name: seh_student_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX seh_student_status_idx ON public.student_enrollment_history USING btree (student_id, status);


--
-- Name: sr_student_sem_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sr_student_sem_idx ON public.student_requests USING btree (student_id, semester_id);


--
-- Name: sr_targetfac_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sr_targetfac_status_idx ON public.student_requests USING btree (target_faculty_id, status);


--
-- Name: te_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX te_active_idx ON public.timetable_entries USING btree (is_active);


--
-- Name: te_assign_sem_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX te_assign_sem_idx ON public.timetable_entries USING btree (assignment_id, semester_id);


--
-- Name: te_div_day_start_sem_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX te_div_day_start_sem_idx ON public.timetable_entries USING btree (division_id, day_of_week, start_time, semester_id);


--
-- Name: te_slot_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX te_slot_idx ON public.timetable_entries USING btree (slot_id);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: attendance_analytics_summary attendance_analytics_summary_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_analytics_summary
    ADD CONSTRAINT attendance_analytics_summary_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: attendance_analytics_summary attendance_analytics_summary_semester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_analytics_summary
    ADD CONSTRAINT attendance_analytics_summary_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.semesters(id);


--
-- Name: attendance_analytics_summary attendance_analytics_summary_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_analytics_summary
    ADD CONSTRAINT attendance_analytics_summary_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: attendance_session_ledger attendance_session_ledger_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_session_ledger
    ADD CONSTRAINT attendance_session_ledger_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: attendance_session_ledger attendance_session_ledger_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_session_ledger
    ADD CONSTRAINT attendance_session_ledger_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.faculty(id);


--
-- Name: attendance_session_ledger attendance_session_ledger_semester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_session_ledger
    ADD CONSTRAINT attendance_session_ledger_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.semesters(id);


--
-- Name: attendance_session_ledger attendance_session_ledger_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_session_ledger
    ADD CONSTRAINT attendance_session_ledger_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: circular_recipients circular_recipients_circular_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.circular_recipients
    ADD CONSTRAINT circular_recipients_circular_id_fkey FOREIGN KEY (circular_id) REFERENCES public.circulars(id) ON DELETE CASCADE;


--
-- Name: circular_recipients circular_recipients_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.circular_recipients
    ADD CONSTRAINT circular_recipients_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE CASCADE;


--
-- Name: circulars circulars_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.circulars
    ADD CONSTRAINT circulars_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.administrators(id);


--
-- Name: circulars circulars_faculty_id_faculty_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.circulars
    ADD CONSTRAINT circulars_faculty_id_faculty_id_fk FOREIGN KEY (faculty_id) REFERENCES public.faculty(id);


--
-- Name: classroom_benches classroom_benches_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_benches
    ADD CONSTRAINT classroom_benches_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- Name: classrooms classrooms_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: counselor_division_assignments counselor_division_assignments_division_id_divisions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.counselor_division_assignments
    ADD CONSTRAINT counselor_division_assignments_division_id_divisions_id_fk FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: counselor_division_assignments counselor_division_assignments_faculty_id_faculty_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.counselor_division_assignments
    ADD CONSTRAINT counselor_division_assignments_faculty_id_faculty_id_fk FOREIGN KEY (faculty_id) REFERENCES public.faculty(id);


--
-- Name: counselor_division_assignments counselor_division_assignments_semester_id_semesters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.counselor_division_assignments
    ADD CONSTRAINT counselor_division_assignments_semester_id_semesters_id_fk FOREIGN KEY (semester_id) REFERENCES public.semesters(id);


--
-- Name: divisions divisions_course_id_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: divisions divisions_semester_id_semesters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_semester_id_semesters_id_fk FOREIGN KEY (semester_id) REFERENCES public.semesters(id);


--
-- Name: exam_eligibility_rules exam_eligibility_rules_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_eligibility_rules
    ADD CONSTRAINT exam_eligibility_rules_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.internal_exams(id) ON DELETE CASCADE;


--
-- Name: exam_hall_allocations exam_hall_allocations_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_hall_allocations
    ADD CONSTRAINT exam_hall_allocations_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id);


--
-- Name: exam_hall_allocations exam_hall_allocations_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_hall_allocations
    ADD CONSTRAINT exam_hall_allocations_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.internal_exams(id) ON DELETE CASCADE;


--
-- Name: exam_schedules exam_schedules_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.internal_exams(id) ON DELETE CASCADE;


--
-- Name: exam_schedules exam_schedules_exam_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_exam_subject_id_fkey FOREIGN KEY (exam_subject_id) REFERENCES public.exam_subjects(id) ON DELETE CASCADE;


--
-- Name: exam_scopes exam_scopes_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_scopes
    ADD CONSTRAINT exam_scopes_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: exam_scopes exam_scopes_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_scopes
    ADD CONSTRAINT exam_scopes_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.internal_exams(id) ON DELETE CASCADE;


--
-- Name: exam_subjects exam_subjects_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_subjects
    ADD CONSTRAINT exam_subjects_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.internal_exams(id) ON DELETE CASCADE;


--
-- Name: exam_subjects exam_subjects_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_subjects
    ADD CONSTRAINT exam_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: faculty_approval_configs faculty_approval_configs_request_type_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_approval_configs
    ADD CONSTRAINT faculty_approval_configs_request_type_code_fkey FOREIGN KEY (request_type_code) REFERENCES public.faculty_request_types(code) ON DELETE CASCADE;


--
-- Name: faculty faculty_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: faculty_request_approvals faculty_request_approvals_approver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_approvals
    ADD CONSTRAINT faculty_request_approvals_approver_user_id_fkey FOREIGN KEY (approver_user_id) REFERENCES public.faculty(id);


--
-- Name: faculty_request_approvals faculty_request_approvals_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_approvals
    ADD CONSTRAINT faculty_request_approvals_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.faculty_requests(id) ON DELETE CASCADE;


--
-- Name: faculty_request_documents faculty_request_documents_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_documents
    ADD CONSTRAINT faculty_request_documents_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.faculty_requests(id) ON DELETE CASCADE;


--
-- Name: faculty_request_proxies faculty_request_proxies_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_proxies
    ADD CONSTRAINT faculty_request_proxies_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE CASCADE;


--
-- Name: faculty_request_proxies faculty_request_proxies_original_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_proxies
    ADD CONSTRAINT faculty_request_proxies_original_faculty_id_fkey FOREIGN KEY (original_faculty_id) REFERENCES public.faculty(id) ON DELETE CASCADE;


--
-- Name: faculty_request_proxies faculty_request_proxies_overridden_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_proxies
    ADD CONSTRAINT faculty_request_proxies_overridden_by_fkey FOREIGN KEY (overridden_by) REFERENCES public.faculty(id);


--
-- Name: faculty_request_proxies faculty_request_proxies_proxy_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_proxies
    ADD CONSTRAINT faculty_request_proxies_proxy_faculty_id_fkey FOREIGN KEY (proxy_faculty_id) REFERENCES public.faculty(id) ON DELETE CASCADE;


--
-- Name: faculty_request_proxies faculty_request_proxies_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_proxies
    ADD CONSTRAINT faculty_request_proxies_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.faculty_requests(id) ON DELETE CASCADE;


--
-- Name: faculty_request_proxies faculty_request_proxies_sender_proxy_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_proxies
    ADD CONSTRAINT faculty_request_proxies_sender_proxy_faculty_id_fkey FOREIGN KEY (sender_proxy_faculty_id) REFERENCES public.faculty(id);


--
-- Name: faculty_request_proxies faculty_request_proxies_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_proxies
    ADD CONSTRAINT faculty_request_proxies_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.timetable_slots(id) ON DELETE CASCADE;


--
-- Name: faculty_request_proxies faculty_request_proxies_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_request_proxies
    ADD CONSTRAINT faculty_request_proxies_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: faculty_requests faculty_requests_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_requests
    ADD CONSTRAINT faculty_requests_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.faculty(id) ON DELETE CASCADE;


--
-- Name: faculty_requests faculty_requests_request_type_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_requests
    ADD CONSTRAINT faculty_requests_request_type_code_fkey FOREIGN KEY (request_type_code) REFERENCES public.faculty_request_types(code) ON DELETE CASCADE;


--
-- Name: faculty_roles faculty_roles_faculty_id_faculty_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_roles
    ADD CONSTRAINT faculty_roles_faculty_id_faculty_id_fk FOREIGN KEY (faculty_id) REFERENCES public.faculty(id);


--
-- Name: faculty_roles faculty_roles_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_roles
    ADD CONSTRAINT faculty_roles_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: faculty_subject_assignments faculty_subject_assignments_division_id_divisions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_subject_assignments
    ADD CONSTRAINT faculty_subject_assignments_division_id_divisions_id_fk FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: faculty_subject_assignments faculty_subject_assignments_faculty_id_faculty_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_subject_assignments
    ADD CONSTRAINT faculty_subject_assignments_faculty_id_faculty_id_fk FOREIGN KEY (faculty_id) REFERENCES public.faculty(id);


--
-- Name: faculty_subject_assignments faculty_subject_assignments_semester_id_semesters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_subject_assignments
    ADD CONSTRAINT faculty_subject_assignments_semester_id_semesters_id_fk FOREIGN KEY (semester_id) REFERENCES public.semesters(id);


--
-- Name: faculty_subject_assignments faculty_subject_assignments_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty_subject_assignments
    ADD CONSTRAINT faculty_subject_assignments_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: internal_evaluations internal_evaluations_assignment_id_faculty_subject_assignments_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_evaluations
    ADD CONSTRAINT internal_evaluations_assignment_id_faculty_subject_assignments_ FOREIGN KEY (assignment_id) REFERENCES public.faculty_subject_assignments(id);


--
-- Name: internal_evaluations internal_evaluations_finalized_by_faculty_id_faculty_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_evaluations
    ADD CONSTRAINT internal_evaluations_finalized_by_faculty_id_faculty_id_fk FOREIGN KEY (finalized_by_faculty_id) REFERENCES public.faculty(id);


--
-- Name: internal_evaluations internal_evaluations_semester_id_semesters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_evaluations
    ADD CONSTRAINT internal_evaluations_semester_id_semesters_id_fk FOREIGN KEY (semester_id) REFERENCES public.semesters(id);


--
-- Name: internal_evaluations internal_evaluations_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_evaluations
    ADD CONSTRAINT internal_evaluations_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: internal_evaluations internal_evaluations_updated_by_faculty_id_faculty_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_evaluations
    ADD CONSTRAINT internal_evaluations_updated_by_faculty_id_faculty_id_fk FOREIGN KEY (updated_by_faculty_id) REFERENCES public.faculty(id);


--
-- Name: internal_exam_marks internal_exam_marks_assignment_id_faculty_subject_assignments_i; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_exam_marks
    ADD CONSTRAINT internal_exam_marks_assignment_id_faculty_subject_assignments_i FOREIGN KEY (assignment_id) REFERENCES public.faculty_subject_assignments(id);


--
-- Name: internal_exam_marks internal_exam_marks_internal_exam_id_internal_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_exam_marks
    ADD CONSTRAINT internal_exam_marks_internal_exam_id_internal_exams_id_fk FOREIGN KEY (internal_exam_id) REFERENCES public.internal_exams(id) ON DELETE CASCADE;


--
-- Name: internal_exam_marks internal_exam_marks_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_exam_marks
    ADD CONSTRAINT internal_exam_marks_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: internal_exam_marks internal_exam_marks_updated_by_faculty_id_faculty_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_exam_marks
    ADD CONSTRAINT internal_exam_marks_updated_by_faculty_id_faculty_id_fk FOREIGN KEY (updated_by_faculty_id) REFERENCES public.faculty(id);


--
-- Name: internal_exams internal_exams_created_by_faculty_id_faculty_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_exams
    ADD CONSTRAINT internal_exams_created_by_faculty_id_faculty_id_fk FOREIGN KEY (created_by_faculty_id) REFERENCES public.faculty(id);


--
-- Name: internal_exams internal_exams_semester_id_semesters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_exams
    ADD CONSTRAINT internal_exams_semester_id_semesters_id_fk FOREIGN KEY (semester_id) REFERENCES public.semesters(id);


--
-- Name: internal_exams internal_exams_target_division_id_divisions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_exams
    ADD CONSTRAINT internal_exams_target_division_id_divisions_id_fk FOREIGN KEY (target_division_id) REFERENCES public.divisions(id);


--
-- Name: marks marks_assignment_id_faculty_subject_assignments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marks
    ADD CONSTRAINT marks_assignment_id_faculty_subject_assignments_id_fk FOREIGN KEY (assignment_id) REFERENCES public.faculty_subject_assignments(id);


--
-- Name: marks marks_semester_id_semesters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marks
    ADD CONSTRAINT marks_semester_id_semesters_id_fk FOREIGN KEY (semester_id) REFERENCES public.semesters(id);


--
-- Name: marks marks_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marks
    ADD CONSTRAINT marks_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: student_enrollment_history seh_division_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_enrollment_history
    ADD CONSTRAINT seh_division_id_fk FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: student_enrollment_history seh_semester_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_enrollment_history
    ADD CONSTRAINT seh_semester_id_fk FOREIGN KEY (semester_id) REFERENCES public.semesters(id);


--
-- Name: student_enrollment_history seh_student_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_enrollment_history
    ADD CONSTRAINT seh_student_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: semesters semesters_academic_year_id_academic_years_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semesters
    ADD CONSTRAINT semesters_academic_year_id_academic_years_id_fk FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: student_documents student_documents_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: student_prior_education student_prior_education_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_prior_education
    ADD CONSTRAINT student_prior_education_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: student_requests student_requests_semester_id_semesters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_requests
    ADD CONSTRAINT student_requests_semester_id_semesters_id_fk FOREIGN KEY (semester_id) REFERENCES public.semesters(id);


--
-- Name: student_requests student_requests_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_requests
    ADD CONSTRAINT student_requests_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: student_requests student_requests_target_faculty_id_faculty_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_requests
    ADD CONSTRAINT student_requests_target_faculty_id_faculty_id_fk FOREIGN KEY (target_faculty_id) REFERENCES public.faculty(id);


--
-- Name: students students_course_id_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: students students_current_division_id_divisions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_current_division_id_divisions_id_fk FOREIGN KEY (current_division_id) REFERENCES public.divisions(id);


--
-- Name: subjects subjects_course_id_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: timetable_entries timetable_entries_assignment_id_faculty_subject_assignments_id_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_assignment_id_faculty_subject_assignments_id_ FOREIGN KEY (assignment_id) REFERENCES public.faculty_subject_assignments(id);


--
-- Name: timetable_entries timetable_entries_division_id_divisions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_division_id_divisions_id_fk FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: timetable_entries timetable_entries_semester_id_semesters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_semester_id_semesters_id_fk FOREIGN KEY (semester_id) REFERENCES public.semesters(id);


--
-- Name: timetable_entries timetable_entries_slot_id_timetable_slots_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_slot_id_timetable_slots_id_fk FOREIGN KEY (slot_id) REFERENCES public.timetable_slots(id);


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea, text[], text[]) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.crypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.dearmor(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_bytes(integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_uuid() FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text, integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO dashboard_user;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_key_id(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1mc() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v4() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION pg_reload_conf(); Type: ACL; Schema: pg_catalog; Owner: supabase_admin
--

GRANT ALL ON FUNCTION pg_catalog.pg_reload_conf() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- Name: TABLE custom_oauth_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.custom_oauth_providers TO postgres;
GRANT ALL ON TABLE auth.custom_oauth_providers TO dashboard_user;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- Name: TABLE oauth_client_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_client_states TO postgres;
GRANT ALL ON TABLE auth.oauth_client_states TO dashboard_user;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- Name: TABLE webauthn_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.webauthn_challenges TO postgres;
GRANT ALL ON TABLE auth.webauthn_challenges TO dashboard_user;


--
-- Name: TABLE webauthn_credentials; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.webauthn_credentials TO postgres;
GRANT ALL ON TABLE auth.webauthn_credentials TO dashboard_user;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements TO dashboard_user;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements_info FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO dashboard_user;


--
-- Name: TABLE academic_years; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.academic_years TO anon;
GRANT ALL ON TABLE public.academic_years TO authenticated;
GRANT ALL ON TABLE public.academic_years TO service_role;


--
-- Name: SEQUENCE academic_years_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.academic_years_id_seq TO anon;
GRANT ALL ON SEQUENCE public.academic_years_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.academic_years_id_seq TO service_role;


--
-- Name: TABLE administrators; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.administrators TO anon;
GRANT ALL ON TABLE public.administrators TO authenticated;
GRANT ALL ON TABLE public.administrators TO service_role;


--
-- Name: SEQUENCE administrators_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.administrators_id_seq TO anon;
GRANT ALL ON SEQUENCE public.administrators_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.administrators_id_seq TO service_role;


--
-- Name: TABLE attendance_analytics_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.attendance_analytics_summary TO anon;
GRANT ALL ON TABLE public.attendance_analytics_summary TO authenticated;
GRANT ALL ON TABLE public.attendance_analytics_summary TO service_role;


--
-- Name: TABLE attendance_session_ledger; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.attendance_session_ledger TO anon;
GRANT ALL ON TABLE public.attendance_session_ledger TO authenticated;
GRANT ALL ON TABLE public.attendance_session_ledger TO service_role;


--
-- Name: SEQUENCE attendance_session_ledger_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.attendance_session_ledger_id_seq TO anon;
GRANT ALL ON SEQUENCE public.attendance_session_ledger_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.attendance_session_ledger_id_seq TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: SEQUENCE audit_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO service_role;


--
-- Name: TABLE circular_recipients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.circular_recipients TO anon;
GRANT ALL ON TABLE public.circular_recipients TO authenticated;
GRANT ALL ON TABLE public.circular_recipients TO service_role;


--
-- Name: SEQUENCE circular_recipients_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.circular_recipients_id_seq TO anon;
GRANT ALL ON SEQUENCE public.circular_recipients_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.circular_recipients_id_seq TO service_role;


--
-- Name: TABLE circulars; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.circulars TO anon;
GRANT ALL ON TABLE public.circulars TO authenticated;
GRANT ALL ON TABLE public.circulars TO service_role;


--
-- Name: SEQUENCE circulars_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.circulars_id_seq TO anon;
GRANT ALL ON SEQUENCE public.circulars_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.circulars_id_seq TO service_role;


--
-- Name: TABLE classroom_benches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.classroom_benches TO anon;
GRANT ALL ON TABLE public.classroom_benches TO authenticated;
GRANT ALL ON TABLE public.classroom_benches TO service_role;


--
-- Name: SEQUENCE classroom_benches_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.classroom_benches_id_seq TO anon;
GRANT ALL ON SEQUENCE public.classroom_benches_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.classroom_benches_id_seq TO service_role;


--
-- Name: TABLE classrooms; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.classrooms TO anon;
GRANT ALL ON TABLE public.classrooms TO authenticated;
GRANT ALL ON TABLE public.classrooms TO service_role;


--
-- Name: SEQUENCE classrooms_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.classrooms_id_seq TO anon;
GRANT ALL ON SEQUENCE public.classrooms_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.classrooms_id_seq TO service_role;


--
-- Name: TABLE counselor_division_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.counselor_division_assignments TO anon;
GRANT ALL ON TABLE public.counselor_division_assignments TO authenticated;
GRANT ALL ON TABLE public.counselor_division_assignments TO service_role;


--
-- Name: SEQUENCE counselor_division_assignments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.counselor_division_assignments_id_seq TO anon;
GRANT ALL ON SEQUENCE public.counselor_division_assignments_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.counselor_division_assignments_id_seq TO service_role;


--
-- Name: TABLE courses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.courses TO anon;
GRANT ALL ON TABLE public.courses TO authenticated;
GRANT ALL ON TABLE public.courses TO service_role;


--
-- Name: SEQUENCE courses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.courses_id_seq TO anon;
GRANT ALL ON SEQUENCE public.courses_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.courses_id_seq TO service_role;


--
-- Name: TABLE divisions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.divisions TO anon;
GRANT ALL ON TABLE public.divisions TO authenticated;
GRANT ALL ON TABLE public.divisions TO service_role;


--
-- Name: SEQUENCE divisions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.divisions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.divisions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.divisions_id_seq TO service_role;


--
-- Name: TABLE exam_eligibility_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.exam_eligibility_rules TO anon;
GRANT ALL ON TABLE public.exam_eligibility_rules TO authenticated;
GRANT ALL ON TABLE public.exam_eligibility_rules TO service_role;


--
-- Name: SEQUENCE exam_eligibility_rules_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.exam_eligibility_rules_id_seq TO anon;
GRANT ALL ON SEQUENCE public.exam_eligibility_rules_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.exam_eligibility_rules_id_seq TO service_role;


--
-- Name: TABLE exam_hall_allocations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.exam_hall_allocations TO anon;
GRANT ALL ON TABLE public.exam_hall_allocations TO authenticated;
GRANT ALL ON TABLE public.exam_hall_allocations TO service_role;


--
-- Name: SEQUENCE exam_hall_allocations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.exam_hall_allocations_id_seq TO anon;
GRANT ALL ON SEQUENCE public.exam_hall_allocations_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.exam_hall_allocations_id_seq TO service_role;


--
-- Name: TABLE exam_schedules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.exam_schedules TO anon;
GRANT ALL ON TABLE public.exam_schedules TO authenticated;
GRANT ALL ON TABLE public.exam_schedules TO service_role;


--
-- Name: SEQUENCE exam_schedules_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.exam_schedules_id_seq TO anon;
GRANT ALL ON SEQUENCE public.exam_schedules_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.exam_schedules_id_seq TO service_role;


--
-- Name: TABLE exam_scopes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.exam_scopes TO anon;
GRANT ALL ON TABLE public.exam_scopes TO authenticated;
GRANT ALL ON TABLE public.exam_scopes TO service_role;


--
-- Name: SEQUENCE exam_scopes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.exam_scopes_id_seq TO anon;
GRANT ALL ON SEQUENCE public.exam_scopes_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.exam_scopes_id_seq TO service_role;


--
-- Name: TABLE exam_subjects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.exam_subjects TO anon;
GRANT ALL ON TABLE public.exam_subjects TO authenticated;
GRANT ALL ON TABLE public.exam_subjects TO service_role;


--
-- Name: SEQUENCE exam_subjects_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.exam_subjects_id_seq TO anon;
GRANT ALL ON SEQUENCE public.exam_subjects_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.exam_subjects_id_seq TO service_role;


--
-- Name: TABLE faculty; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.faculty TO anon;
GRANT ALL ON TABLE public.faculty TO authenticated;
GRANT ALL ON TABLE public.faculty TO service_role;


--
-- Name: TABLE faculty_approval_configs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.faculty_approval_configs TO anon;
GRANT ALL ON TABLE public.faculty_approval_configs TO authenticated;
GRANT ALL ON TABLE public.faculty_approval_configs TO service_role;


--
-- Name: SEQUENCE faculty_approval_configs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.faculty_approval_configs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.faculty_approval_configs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.faculty_approval_configs_id_seq TO service_role;


--
-- Name: SEQUENCE faculty_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.faculty_id_seq TO anon;
GRANT ALL ON SEQUENCE public.faculty_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.faculty_id_seq TO service_role;


--
-- Name: TABLE faculty_request_approvals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.faculty_request_approvals TO anon;
GRANT ALL ON TABLE public.faculty_request_approvals TO authenticated;
GRANT ALL ON TABLE public.faculty_request_approvals TO service_role;


--
-- Name: SEQUENCE faculty_request_approvals_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.faculty_request_approvals_id_seq TO anon;
GRANT ALL ON SEQUENCE public.faculty_request_approvals_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.faculty_request_approvals_id_seq TO service_role;


--
-- Name: TABLE faculty_request_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.faculty_request_documents TO anon;
GRANT ALL ON TABLE public.faculty_request_documents TO authenticated;
GRANT ALL ON TABLE public.faculty_request_documents TO service_role;


--
-- Name: SEQUENCE faculty_request_documents_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.faculty_request_documents_id_seq TO anon;
GRANT ALL ON SEQUENCE public.faculty_request_documents_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.faculty_request_documents_id_seq TO service_role;


--
-- Name: TABLE faculty_request_proxies; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.faculty_request_proxies TO anon;
GRANT ALL ON TABLE public.faculty_request_proxies TO authenticated;
GRANT ALL ON TABLE public.faculty_request_proxies TO service_role;


--
-- Name: SEQUENCE faculty_request_proxies_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.faculty_request_proxies_id_seq TO anon;
GRANT ALL ON SEQUENCE public.faculty_request_proxies_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.faculty_request_proxies_id_seq TO service_role;


--
-- Name: TABLE faculty_request_types; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.faculty_request_types TO anon;
GRANT ALL ON TABLE public.faculty_request_types TO authenticated;
GRANT ALL ON TABLE public.faculty_request_types TO service_role;


--
-- Name: SEQUENCE faculty_request_types_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.faculty_request_types_id_seq TO anon;
GRANT ALL ON SEQUENCE public.faculty_request_types_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.faculty_request_types_id_seq TO service_role;


--
-- Name: TABLE faculty_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.faculty_requests TO anon;
GRANT ALL ON TABLE public.faculty_requests TO authenticated;
GRANT ALL ON TABLE public.faculty_requests TO service_role;


--
-- Name: SEQUENCE faculty_requests_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.faculty_requests_id_seq TO anon;
GRANT ALL ON SEQUENCE public.faculty_requests_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.faculty_requests_id_seq TO service_role;


--
-- Name: TABLE faculty_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.faculty_roles TO anon;
GRANT ALL ON TABLE public.faculty_roles TO authenticated;
GRANT ALL ON TABLE public.faculty_roles TO service_role;


--
-- Name: TABLE faculty_subject_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.faculty_subject_assignments TO anon;
GRANT ALL ON TABLE public.faculty_subject_assignments TO authenticated;
GRANT ALL ON TABLE public.faculty_subject_assignments TO service_role;


--
-- Name: SEQUENCE faculty_subject_assignments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.faculty_subject_assignments_id_seq TO anon;
GRANT ALL ON SEQUENCE public.faculty_subject_assignments_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.faculty_subject_assignments_id_seq TO service_role;


--
-- Name: TABLE internal_evaluations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.internal_evaluations TO anon;
GRANT ALL ON TABLE public.internal_evaluations TO authenticated;
GRANT ALL ON TABLE public.internal_evaluations TO service_role;


--
-- Name: SEQUENCE internal_evaluations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.internal_evaluations_id_seq TO anon;
GRANT ALL ON SEQUENCE public.internal_evaluations_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.internal_evaluations_id_seq TO service_role;


--
-- Name: TABLE internal_exam_marks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.internal_exam_marks TO anon;
GRANT ALL ON TABLE public.internal_exam_marks TO authenticated;
GRANT ALL ON TABLE public.internal_exam_marks TO service_role;


--
-- Name: SEQUENCE internal_exam_marks_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.internal_exam_marks_id_seq TO anon;
GRANT ALL ON SEQUENCE public.internal_exam_marks_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.internal_exam_marks_id_seq TO service_role;


--
-- Name: TABLE internal_exams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.internal_exams TO anon;
GRANT ALL ON TABLE public.internal_exams TO authenticated;
GRANT ALL ON TABLE public.internal_exams TO service_role;


--
-- Name: SEQUENCE internal_exams_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.internal_exams_id_seq TO anon;
GRANT ALL ON SEQUENCE public.internal_exams_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.internal_exams_id_seq TO service_role;


--
-- Name: TABLE marks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.marks TO anon;
GRANT ALL ON TABLE public.marks TO authenticated;
GRANT ALL ON TABLE public.marks TO service_role;


--
-- Name: SEQUENCE marks_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.marks_id_seq TO anon;
GRANT ALL ON SEQUENCE public.marks_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.marks_id_seq TO service_role;


--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.roles TO anon;
GRANT ALL ON TABLE public.roles TO authenticated;
GRANT ALL ON TABLE public.roles TO service_role;


--
-- Name: SEQUENCE roles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.roles_id_seq TO anon;
GRANT ALL ON SEQUENCE public.roles_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.roles_id_seq TO service_role;


--
-- Name: TABLE rooms; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rooms TO anon;
GRANT ALL ON TABLE public.rooms TO authenticated;
GRANT ALL ON TABLE public.rooms TO service_role;


--
-- Name: SEQUENCE rooms_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.rooms_id_seq TO anon;
GRANT ALL ON SEQUENCE public.rooms_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.rooms_id_seq TO service_role;


--
-- Name: TABLE semesters; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.semesters TO anon;
GRANT ALL ON TABLE public.semesters TO authenticated;
GRANT ALL ON TABLE public.semesters TO service_role;


--
-- Name: SEQUENCE semesters_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.semesters_id_seq TO anon;
GRANT ALL ON SEQUENCE public.semesters_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.semesters_id_seq TO service_role;


--
-- Name: TABLE student_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.student_documents TO anon;
GRANT ALL ON TABLE public.student_documents TO authenticated;
GRANT ALL ON TABLE public.student_documents TO service_role;


--
-- Name: SEQUENCE student_documents_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.student_documents_id_seq TO anon;
GRANT ALL ON SEQUENCE public.student_documents_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.student_documents_id_seq TO service_role;


--
-- Name: TABLE student_enrollment_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.student_enrollment_history TO anon;
GRANT ALL ON TABLE public.student_enrollment_history TO authenticated;
GRANT ALL ON TABLE public.student_enrollment_history TO service_role;


--
-- Name: SEQUENCE student_enrollment_history_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.student_enrollment_history_id_seq TO anon;
GRANT ALL ON SEQUENCE public.student_enrollment_history_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.student_enrollment_history_id_seq TO service_role;


--
-- Name: TABLE student_prior_education; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.student_prior_education TO anon;
GRANT ALL ON TABLE public.student_prior_education TO authenticated;
GRANT ALL ON TABLE public.student_prior_education TO service_role;


--
-- Name: SEQUENCE student_prior_education_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.student_prior_education_id_seq TO anon;
GRANT ALL ON SEQUENCE public.student_prior_education_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.student_prior_education_id_seq TO service_role;


--
-- Name: TABLE student_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.student_requests TO anon;
GRANT ALL ON TABLE public.student_requests TO authenticated;
GRANT ALL ON TABLE public.student_requests TO service_role;


--
-- Name: SEQUENCE student_requests_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.student_requests_id_seq TO anon;
GRANT ALL ON SEQUENCE public.student_requests_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.student_requests_id_seq TO service_role;


--
-- Name: TABLE students; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.students TO anon;
GRANT ALL ON TABLE public.students TO authenticated;
GRANT ALL ON TABLE public.students TO service_role;


--
-- Name: SEQUENCE students_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.students_id_seq TO anon;
GRANT ALL ON SEQUENCE public.students_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.students_id_seq TO service_role;


--
-- Name: TABLE subjects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subjects TO anon;
GRANT ALL ON TABLE public.subjects TO authenticated;
GRANT ALL ON TABLE public.subjects TO service_role;


--
-- Name: SEQUENCE subjects_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.subjects_id_seq TO anon;
GRANT ALL ON SEQUENCE public.subjects_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.subjects_id_seq TO service_role;


--
-- Name: TABLE timetable_entries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.timetable_entries TO anon;
GRANT ALL ON TABLE public.timetable_entries TO authenticated;
GRANT ALL ON TABLE public.timetable_entries TO service_role;


--
-- Name: SEQUENCE timetable_entries_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.timetable_entries_id_seq TO anon;
GRANT ALL ON SEQUENCE public.timetable_entries_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.timetable_entries_id_seq TO service_role;


--
-- Name: TABLE timetable_slots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.timetable_slots TO anon;
GRANT ALL ON TABLE public.timetable_slots TO authenticated;
GRANT ALL ON TABLE public.timetable_slots TO service_role;


--
-- Name: SEQUENCE timetable_slots_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.timetable_slots_id_seq TO anon;
GRANT ALL ON SEQUENCE public.timetable_slots_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.timetable_slots_id_seq TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.schema_migrations TO postgres;
GRANT ALL ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT ALL ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.buckets FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.buckets TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE buckets_vectors; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.buckets_vectors TO service_role;
GRANT SELECT ON TABLE storage.buckets_vectors TO authenticated;
GRANT SELECT ON TABLE storage.buckets_vectors TO anon;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.objects FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.objects TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- Name: TABLE vector_indexes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.vector_indexes TO service_role;
GRANT SELECT ON TABLE storage.vector_indexes TO authenticated;
GRANT SELECT ON TABLE storage.vector_indexes TO anon;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

\unrestrict erqlNCVkcDkYrJURD2AFQY5vyUgOQnrUeaP4GEViPB32DXCgPBH57awoKJ5gDtJ

