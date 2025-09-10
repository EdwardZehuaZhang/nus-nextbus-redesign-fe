# Copilot Instructions for AI Coding Agents

## Project Overview
This is a React Native/Expo monorepo template focused on developer experience, performance, and maintainability. It uses Expo, TypeScript, Nativewind (Tailwind CSS for React Native), Expo Router, React Query, Zustand, and other modern tools. The structure and conventions are designed for rapid onboarding and consistent code quality.

## Architecture & Structure
- **src/** is the main source directory:
  - **api/**: Data fetching (axios, react-query), API types
  - **app/**: Expo Router file-based navigation, screens, layouts
  - **components/**: Shared UI components (modular, <80 lines each)
  - **lib/**: Shared libraries (auth, env, hooks, i18n, storage, utils)
  - **translations/**: i18next translation files
  - **types/**: Shared TypeScript types
- **cli/**: Project setup and utility scripts
- **docs/**: Documentation site (Astro/Starlight)

## Code Style & Patterns
- Use functional, declarative TypeScript (no classes)
- Prefer named exports, strict types, and 'as const' objects over enums
- Use absolute imports (e.g., `@/components/card`)
- File and directory names: kebab-case
- Components: single responsibility, modular, maintainable
- Variable names: descriptive, use auxiliary verbs (e.g., isLoading, hasError)
- Avoid try/catch unless error translation/handling is required
- Explicit return types for all functions

## Developer Workflows
- **Install packages:** `npx expo install <package-name>`
- **Run app (dev):** `npx expo start`
- **Build (Android/iOS):** See `eas.json` for EAS build config
- **Lint & format:** `pnpm lint` (uses ESLint, lint-staged, Husky)
- **Test (unit):** `pnpm test` (Jest, React Testing Library)
- **E2E test:** Maestro (see docs)
- **Git hooks:** Automated via Husky
- **Environment config:** Multi-env via Expo config and `.env.*` files

## Integration Points
- **State management:** Zustand (auth, global state)
- **Data fetching:** React Query + axios
- **Storage:** react-native-mmkv
- **Forms:** react-hook-form + zod
- **Localization:** i18next, translations in `src/translations/`
- **Navigation:** Expo Router (file-based)

## Project-Specific Conventions
- All code in TypeScript; prefer types over interfaces
- No enums; use const objects with 'as const'
- Modularize components (<80 lines, single responsibility)
- Use absolute imports everywhere
- Use kebab-case for files/directories
- Use functional components only

## Example Patterns
- API calls: `src/api/` with react-query hooks
- Auth flow: Zustand store in `src/lib/auth/`
- UI components: `src/components/ui/` (buttons, inputs, etc.)
- Translations: `src/translations/en.json`, etc.

## References
- See `.cursorrules` for additional code style and structure rules
- See `README.md` for project philosophy and feature overview
- See `cli/README.md` for CLI usage and quickstart

---

**If any section is unclear or missing, please provide feedback so this guide can be improved.**
