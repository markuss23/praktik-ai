# Files

- [Assessment & Practice Evaluation Workflows](assessment-and-practice.md) - How AI-driven module assessments (question generation, evaluation, attempt limits) and personalized practice questions are generated and graded, and how students escalate disputes via module_tickets.
- [AI Course Generation Workflow](course-generation.md) - How a lector-triggered course generation request becomes a detached background task that runs the course_generator LangGraph pipeline, reports progress for polling, and persists modules, learn blocks, and practice questions.
- [RAG Mentor & Wiki Chat Assistants](mentor-and-wiki-chat.md) - How the in-course AI mentor answers student questions about a LearnBlock's content, and how the separate admin-facing wiki chat answers questions about this repository's GitHub wiki, both built as LangGraph RAG pipelines over pgvector.
