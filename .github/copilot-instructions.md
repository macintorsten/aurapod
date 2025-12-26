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

## Conventions
- TypeScript strict mode enabled
- Co-locate tests with source in `__tests__/` directories
- Barrel exports via `index.ts` for clean imports
- Hash-based routing for static hosting compatibility
