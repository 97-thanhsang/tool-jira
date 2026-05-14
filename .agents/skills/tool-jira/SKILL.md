```markdown
# tool-jira Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `tool-jira` TypeScript codebase. It covers file organization, coding style, commit practices, and testing approaches, enabling contributors to write consistent, maintainable code and collaborate effectively.

## Coding Conventions

### File Naming
- All files use **kebab-case**.
  - Example:  
    ```
    jira-client.ts
    issue-utils.ts
    ```

### Import Style
- Imports use **alias** style, often referencing modules or paths with aliases.
  - Example:
    ```typescript
    import { JiraIssue } from '@models/jira-issue';
    import { fetchIssues } from '@utils/issue-utils';
    ```

### Export Style
- Both **named** and **default exports** are used, depending on the module's purpose.
  - Example (named export):
    ```typescript
    export function createJiraTicket(data: TicketData): Promise<JiraTicket> { ... }
    ```
  - Example (default export):
    ```typescript
    export default JiraClient;
    ```

### Commit Messages
- Follows the **Conventional Commits** standard.
- Uses the `feat` prefix for new features.
  - Example:
    ```
    feat: add support for bulk issue creation in Jira client
    ```

## Workflows

### Feature Development
**Trigger:** When adding a new feature or capability  
**Command:** `/feature-development`

1. Create a new branch with a descriptive name (use kebab-case).
2. Implement the feature in TypeScript, following import/export conventions.
3. Write or update tests in files matching `*.test.*`.
4. Commit changes using the `feat:` prefix and a concise description.
5. Open a pull request for review.

### Testing Code
**Trigger:** When validating code changes  
**Command:** `/run-tests`

1. Identify or create test files using the `*.test.*` pattern.
2. Run the test suite with the appropriate test runner (framework unknown; check project scripts).
3. Ensure all tests pass before merging or deploying.

### Code Review Preparation
**Trigger:** Before submitting code for review  
**Command:** `/prepare-review`

1. Check that all files use kebab-case naming.
2. Ensure imports use aliases where applicable.
3. Verify exports follow the project's mixed style.
4. Confirm commit messages follow the conventional pattern.
5. Run all tests and confirm they pass.

## Testing Patterns

- Test files follow the `*.test.*` naming convention (e.g., `jira-client.test.ts`).
- The specific testing framework is not detected; check the project for scripts or dependencies.
- Tests should cover new features and edge cases.
- Example test file structure:
  ```typescript
  import { createJiraTicket } from '@utils/jira-client';

  describe('createJiraTicket', () => {
    it('should create a ticket with valid data', async () => {
      // test implementation
    });
  });
  ```

## Commands
| Command              | Purpose                                   |
|----------------------|-------------------------------------------|
| /feature-development | Start a new feature development workflow  |
| /run-tests           | Run the test suite                        |
| /prepare-review      | Prepare code for review                   |
```
