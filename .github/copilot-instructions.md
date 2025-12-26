# AuraPod Project Instructions

## Skill System
Before implementing any feature, check available skills in `.github/skills/`. Use relevant skills:
- `brainstorming` - Before creating features or components
- `test-driven-development` - When implementing features
- `systematic-debugging` - When encountering bugs
- `code-review` - Before merging work

## Architecture
- **Services**: Use dependency injection pattern (see `src/services/container.ts`)
- **Components**: Prefer container/presentation split for complex components
- **State**: Use React Context for cross-cutting concerns (see `src/contexts/`)
- **Testing**: Test in isolation without full app setup (see `TESTING_GUIDE.md`)

## Code Quality
- Run `npm run test:unused` to detect dead code (warns about unused exports)
- AI agents should review ts-prune warnings and remove unused code
- Pre-commit hooks run type checking + related tests automatically

## Conventions
- TypeScript strict mode enabled
- Co-locate tests with source in `__tests__/` directories
- Barrel exports via `index.ts` for clean imports
- Hash-based routing for static hosting compatibility
