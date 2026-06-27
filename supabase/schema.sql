-- VACT Question Bank & Exam Management System Schema

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. ENUMS
create type question_status as enum ('Draft', 'Pending Review', 'Approved', 'Rejected', 'Archived');
create type user_role as enum ('Admin', 'Content Manager', 'Reviewer', 'Exam Builder', 'Analyst');

-- 2. TABLES

-- Roles/Users are typically handled via Supabase Auth + public.users table or custom profiles
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role user_role default 'Reviewer',
  assigned_domains text[], -- e.g., ['Mathematics', 'Physics']
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Section (e.g. Mathematics, English, Vietnamese, Scientific Reasoning)
create table sections (
  code text primary key,
  name text not null,
  description text
);

-- Knowledge Tree
create table knowledge_nodes (
  code text primary key,
  name text not null,
  parent_code text references knowledge_nodes(code),
  section_code text references sections(code) not null,
  description text, -- Markdown + LaTeX support
  difficulty_base numeric(3,2) default 0.5, -- For IRT weighting
  discrimination_base numeric(3,2) default 1.0
);

-- Question Bank (CâuHỏi & NgữLiệu)
create table passages (
  id uuid default uuid_generate_v4() primary key,
  title text,
  content text not null, -- Markdown + LaTeX support
  created_at timestamp with time zone default now()
);

create table questions (
  id uuid default uuid_generate_v4() primary key,
  passage_id uuid references passages(id),
  content text not null, -- Markdown + LaTeX support
  difficulty text, -- e.g., 'Nhận biết', 'Thông hiểu', etc.
  status question_status default 'Draft',
  created_by uuid references profiles(id),
  reviewer_id uuid references profiles(id),
  reviewer_notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  -- IRT Metrics (populated by external Python service)
  irt_a numeric(5,3), -- Discrimination
  irt_b numeric(5,3), -- Difficulty
  irt_c numeric(5,3)  -- Guessing
);

-- Question Answers (ĐápÁn)
create table answers (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references questions(id) on delete cascade,
  content text not null, -- Markdown + LaTeX support
  is_correct boolean default false,
  order_index integer
);

-- Question Knowledge Link (KiếnThứcCâuHỏi)
-- Many-to-many relationship
create table question_knowledge (
  question_id uuid references questions(id) on delete cascade,
  knowledge_code text references knowledge_nodes(code) on delete cascade,
  primary key (question_id, knowledge_code)
);

-- Exam & Matrix
create table exam_sessions (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  name text not null,
  academic_year text,
  semester text,
  exam_type text,
  schedule_start timestamp with time zone,
  schedule_end timestamp with time zone,
  status text default 'Draft'
);

create table exam_matrices (
  id uuid default uuid_generate_v4() primary key,
  exam_session_id uuid references exam_sessions(id) on delete cascade,
  knowledge_code text references knowledge_nodes(code),
  cognitive_level text,
  quantity integer not null,
  irt_target_b numeric(5,3),
  created_at timestamp with time zone default now()
);

-- Generated Exams & Versions (ĐềThi)
create table exams (
  id uuid default uuid_generate_v4() primary key,
  exam_session_id uuid references exam_sessions(id) on delete cascade,
  version_code text not null, -- e.g., 101, 102
  created_at timestamp with time zone default now()
);

create table exam_questions (
  exam_id uuid references exams(id) on delete cascade,
  question_id uuid references questions(id),
  position_index integer not null,
  primary key (exam_id, question_id)
);

-- To shuffle answers per exam version
create table exam_question_answers (
  exam_id uuid references exams(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  answer_id uuid references answers(id) on delete cascade,
  shuffled_order_index integer not null,
  primary key (exam_id, question_id, answer_id)
);

-- Candidates & Results
create table candidates (
  id uuid default uuid_generate_v4() primary key,
  registration_number text unique not null,
  full_name text not null,
  date_of_birth date
);

create table exam_attempts (
  id uuid default uuid_generate_v4() primary key,
  candidate_id uuid references candidates(id),
  exam_id uuid references exams(id),
  started_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  -- Result data
  raw_score integer,
  irt_theta numeric(5,3), -- Candidate ability estimate from Python IRT
  standard_error numeric(5,3)
);

create table attempt_answers (
  attempt_id uuid references exam_attempts(id) on delete cascade,
  question_id uuid references questions(id),
  selected_answer_id uuid references answers(id),
  is_correct boolean,
  response_time_ms integer,
  primary key (attempt_id, question_id)
);


-- 3. RLS POLICIES (Example basics)
alter table profiles enable row level security;
alter table questions enable row level security;

-- Profiles: Users can read all profiles (if internal), but only update their own
create policy "Profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Questions: Admins and Reviewers can view all. Content managers can create.
create policy "Read access for all auth users" on questions for select using (auth.role() = 'authenticated');
create policy "Insert access for managers" on questions for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('Admin', 'Content Manager'))
);
create policy "Update access for managers and reviewers" on questions for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('Admin', 'Content Manager', 'Reviewer'))
);

-- Note: This is a foundational schema. Add indices on frequently queried foreign keys for database optimization.
create index idx_qk_question on question_knowledge(question_id);
create index idx_qk_knowledge on question_knowledge(knowledge_code);
create index idx_answers_question on answers(question_id);
create index idx_exam_q_exam on exam_questions(exam_id);
