# VACT - Neural Command Architecture

## 1. System Architecture
- **Frontend**: React 19 + Vite + TailwindCSS v4.
- **Backend & Database**: Supabase (PostgreSQL) handling Auth, Storage, and persistent data.
- **IRT Engine**: External Python service. Communication via Supabase Edge Functions or direct frontend secure calls (via API Gateway).
- **Styling**: "Neural Command" theme, leveraging Glassmorphism and Minimalist Futurism. 

## 2. React Project Structure
```text
/src
  /components
    Layout.tsx       - Global navigation and sidebar
    MathRenderer.tsx - KaTeX & Markdown wrapper for formulas
  /pages
    Dashboard.tsx    - System Core overview
    Knowledge.tsx    - Knowledge Tree & Psychometric Weighting
    Questions.tsx    - Bulk Import & Validation Filters
    QuestionEdit.tsx - Rich Text + LaTeX editor
    QuestionReview.tsx - Review Queue & ICC Distractor Analysis
    Matrix.tsx       - Automatic Matrix Generator (Random/IRT/Psycho)
    Exams.tsx        - Exam Management
    Analytics.tsx    - IRT Analytics (KR-20, Mean Difficulty)
    Users.tsx        - Role-Based Access Control
  /lib
    utils.ts         - Tailwind styling utilities
  supabaseClient.ts  - Supabase Connection Config
```

## 7. API Layer Design (IRT Integration)
The React application (or Supabase Edge Functions) will integrate with the existing Python IRT service via REST:

* `POST /irt/analyze-item`
  * Payload: Candidate responses matrix (`0` for incorrect, `1` for correct) for a specific item.
  * Response: Discrimination (a), Difficulty (b), Guessing (c), and PtBisser values.
* `POST /irt/score-exam`
  * Payload: Exam version map, Candidate answers.
  * Response: Computed scores and raw totals.
* `POST /irt/ability`
  * Payload: Vector of candidate responses (`0/1/NaN`).
  * Response: Theta ($\theta$) estimation and standard error.
* `POST /irt/recompute`
  * Payload: Dataset ID. Triggers asynchronous batch update of item parameters in the Supabase `questions` table.

## 8. Database Optimization
- Use **UUIDs** for all primary keys to ensure secure distributed generation.
- **Many-to-Many Linking**: `question_knowledge` handles mapping single questions to multiple knowledge nodes.
- **Indexes**: Applied to foreign keys (`question_id`, `exam_id`) to prevent sequential scans during exam generation.
- **Storage**: LaTeX formulas are stored strictly as `TEXT` in the `content` fields to ensure PDF export compatibility without data loss.

## 9. Exam Generation Logic
1. Administrator defines constraints in `exam_matrices`.
2. Algorithm pulls item pool matching Knowledge Code and Cognitive Level.
3. If **IRT-Optimized** is selected, the system filters out items that fall outside the configured `Difficulty Range` and `Min Discrimination`.
4. The system creates unique `version_code` instances, shuffling the array of selected items and their corresponding `answers` to prevent cheating.

## 10. Knowledge Tree Logic
- Follows an Adjacency List model (`parent_code` referencing `code`).
- Prefixes enforce structured queries (e.g., `LIKE 'MA.%'`).

## 11. Complete Implementation Roadmap
1. **Phase 1**: Setup React, Vite, Tailwind, and Supabase client. (Completed)
2. **Phase 2**: Implement core UI layouts and navigation. (Completed)
3. **Phase 3**: Configure LaTeX Markdown rendering safely. (Completed)
4. **Phase 4**: Setup Database tables, Enums, and Row Level Security. (Completed)
5. **Phase 5**: Connect UI forms to Supabase `insert/update` endpoints.
6. **Phase 6**: Integrate standard `fetch` or `axios` calls to the Python IRT service.
7. **Phase 7**: Implement secure PDF exports via `react-pdf` handling the LaTeX AST.
