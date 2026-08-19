# Repo Explorer UI

## Prompt 1 — Lovable: Build the Frontend Foundation




### Tool




Lovable




### Goal




Create the initial frontend experience without implementing the real backend.




### Prompt




```text

You are working on the RepoLens project.




Before making changes, understand the project requirements provided in the project context.




RepoLens is a developer tool that helps users understand unfamiliar GitHub repositories.




The core product flow is:




GitHub repository URL

→ repository analysis

→ file/folder structure

→ code relationships

→ interactive graph

→ node details

→ flow tracing

→ AI explanation




Your task is ONLY to create the frontend foundation and UI experience.




Technology requirements:




- React

- Vite

- Tailwind CSS

- React Router

- React Flow for graph visualization




Create a professional developer-tool interface.




Required screens/components:




1. Landing/Home page

2. GitHub repository URL input

3. Repository validation/error states

4. Analysis loading state

5. Repository overview/dashboard

6. File/folder explorer

7. Interactive graph workspace

8. Graph toolbar

9. Node details panel

10. Search UI

11. Relationship filters

12. Flow tracing area

13. AI explanation panel

14. Empty states

15. Error states

16. Responsive layout




The visual design should feel like a serious developer/code-analysis product, not a generic SaaS landing page.




Use reusable components.




Keep graph data mocked only where necessary for UI development.




IMPORTANT:




- Do NOT implement the real GitHub integration.

- Do NOT implement repository analysis.

- Do NOT implement AST parsing.

- Do NOT implement the backend.

- Do NOT create fake APIs pretending to be functional.

- Do NOT introduce another frontend framework.

- Do NOT change the planned architecture.




Use mock/static data only to demonstrate the UI.




After implementation, explain:




1. What files were created or changed.

2. The frontend folder structure.

3. How the major components are organized.

4. Which parts are currently mock data.

5. How the real backend will later connect.




STOP after the frontend foundation is complete.

```




### Success Criteria




- UI works

- routes work

- responsive layout works

- graph workspace exists

- no fake backend behavior

- no backend architecture introduced

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4f1d800c-a789-4c8e-a315-b870449f9890).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
