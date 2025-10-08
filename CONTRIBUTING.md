# Contributing to NUS NextBus Redesign

Thank you for your interest in contributing to the NUS NextBus Redesign project! We welcome contributions from the community.

## 🤝 How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots (if applicable)
- Device/platform information
- App version

### Suggesting Features

Feature suggestions are welcome! Please:

- Check existing issues to avoid duplicates
- Provide a clear description of the feature
- Explain the use case and benefits
- Include mockups or examples if possible

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Write clean, self-documenting code
   - Add comments for complex logic
   - Update documentation if needed

4. **Test your changes**

   ```bash
   pnpm lint          # Check code style
   pnpm type-check    # TypeScript validation
   pnpm test          # Run tests
   ```

5. **Commit your changes**

   ```bash
   git commit -m "feat: add amazing feature"
   ```

   Follow conventional commits:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code formatting (no logic change)
   - `refactor:` Code restructuring
   - `test:` Adding tests
   - `chore:` Maintenance tasks

6. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Provide a clear description
   - Reference related issues
   - Add screenshots for UI changes
   - Ensure all checks pass

## 📋 Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Use functional components and hooks
- Keep components small and focused (<80 lines)
- Use absolute imports (`@/components/...`)
- File names: kebab-case (`bus-indicator.tsx`)
- Component names: PascalCase (`BusIndicator`)

### Project Structure

```
src/
├── api/          # API integration
├── app/          # Expo Router pages
├── components/   # Reusable components
├── lib/          # Utilities & helpers
└── types/        # TypeScript types
```

### State Management

- Use React Query for server state
- Use Zustand for client state
- Use MMKV for persistent storage
- Avoid prop drilling (use context when needed)

### Testing

- Write unit tests for utilities and hooks
- Write component tests for UI components
- Test user interactions and edge cases
- Aim for meaningful coverage, not 100%

### Environment Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm start

# Run with production backend
pnpm run start:production

# Clear cache if needed
pnpm start -c
```

## 🐛 Bug Fix Guidelines

1. **Reproduce the bug** locally
2. **Write a failing test** that demonstrates the bug
3. **Fix the bug** with minimal changes
4. **Verify the test passes**
5. **Test related functionality** to avoid regressions
6. **Document the fix** in the commit message

## ✨ Feature Development Guidelines

1. **Discuss the feature** in an issue first
2. **Break down large features** into smaller PRs
3. **Write tests** for new functionality
4. **Update documentation** (README, comments)
5. **Consider performance** implications
6. **Ensure accessibility** standards

## 🔍 Code Review Process

All submissions require review before merging:

- Code follows project conventions
- Changes are well-tested
- Documentation is updated
- No breaking changes (or clearly communicated)
- CI/CD checks pass

## 📞 Getting Help

- **Questions?** Open a discussion
- **Stuck?** Ask in the issue or PR
- **Need context?** Check existing code and docs

## 🙏 Recognition

Contributors will be acknowledged in:

- Project README
- Release notes
- GitHub contributors page

Thank you for contributing! 🚌
