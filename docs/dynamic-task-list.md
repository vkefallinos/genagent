# Dynamic Task List

The Dynamic Task List feature allows agents to create, update, and complete tasks dynamically during execution, providing flexibility for adaptive workflows and complex multi-step operations.

## Overview

Unlike the static `defTaskList` which requires all tasks to be defined upfront with validation functions, `defDynamicTaskList` gives the agent full control to:

- Create new tasks as they discover requirements
- Update pending task descriptions
- Start tasks before working on them
- Complete tasks with results
- Delete tasks that are no longer needed
- View the current task list state at any time

## Basic Usage

```typescript
import { runPrompt } from 'genagent';

const result = await runPrompt(
  async ({ defDynamicTaskList, $ }) => {
    // Enable dynamic task list mode
    defDynamicTaskList();

    return $`You are a project planner. Create a task list for building
             a web application, and complete each task systematically.`;
  },
  {
    model: 'openai:gpt-4',
    system: ['You are a software project planner.']
  }
);
```

## Available Tools

When `defDynamicTaskList()` is called, the following tools become available to the agent:

### createTask

Create a new task and add it to the task list.

```typescript
// Agent usage:
createTask({
  description: "Set up project repository"
})
// Returns: "✓ Created task task-1: 'Set up project repository'\n\nTotal tasks: 1"
```

**Parameters:**
- `description` (string): Clear description of what needs to be done

**Returns:** Confirmation message with task ID and total task count

### startTask

Mark a pending task as in-progress before working on it.

```typescript
// Agent usage:
startTask({
  taskId: "task-1"
})
// Returns: "✓ Started task task-1: 'Set up project repository'"
```

**Parameters:**
- `taskId` (string): The ID of the task to start

**Returns:** Confirmation message

**Note:** Cannot start completed tasks or tasks already in progress

### completeTask

Mark a task as completed with a result.

```typescript
// Agent usage:
completeTask({
  taskId: "task-1",
  result: "Repository created at github.com/user/project with initial structure"
})
// Returns: "✓ Task task-1 completed!\n  Result: ...\n\nProgress: 1/5 tasks completed"
```

**Parameters:**
- `taskId` (string): The ID of the task to complete
- `result` (string): The result or outcome of completing the task

**Returns:** Confirmation with progress indicator

### updateTask

Update the description of a pending task.

```typescript
// Agent usage:
updateTask({
  taskId: "task-2",
  newDescription: "Design database schema with user authentication"
})
// Returns: "✓ Updated task task-2:\n  Old: 'Design database'\n  New: '...'"
```

**Parameters:**
- `taskId` (string): The ID of the task to update
- `newDescription` (string): The new description for the task

**Returns:** Confirmation showing old and new descriptions

**Note:** Cannot update completed or in-progress tasks

### getTaskList

Get the current state of all tasks in the task list.

```typescript
// Agent usage:
getTaskList({})
// Returns: Formatted task list overview
```

**Returns:**
```
Task List Overview: 2/5 completed

Completed (2):
✓ [task-1] Set up project repository
  Result: Repository created at github.com/user/project
✓ [task-2] Design database schema
  Result: Schema designed with user and post tables

In Progress (1):
→ [task-3] Implement authentication

Pending (2):
○ [task-4] Create REST API endpoints
○ [task-5] Write unit tests
```

### deleteTask

Delete a pending task from the list.

```typescript
// Agent usage:
deleteTask({
  taskId: "task-6"
})
// Returns: "✓ Deleted task task-6: '...'\n\nRemaining tasks: 5"
```

**Parameters:**
- `taskId` (string): The ID of the task to delete

**Returns:** Confirmation with remaining task count

**Note:** Cannot delete completed or in-progress tasks

## Task Object Structure

Each task has the following properties:

```typescript
interface DynamicTask {
  id: string;              // Unique identifier (e.g., "task-1")
  description: string;     // Task description
  status: 'pending' | 'in_progress' | 'completed';
  result?: string;         // Result when completed
  createdAt: number;       // Creation timestamp
  completedAt?: number;    // Completion timestamp
}
```

## Automatic Context Management

The dynamic task list system automatically manages the conversation context to ensure all tasks are completed:

1. **Replaces message history**: After tasks are created, the system completely replaces the message history (like `defTaskList`) to keep the agent focused
2. **Shows focused context**: Each turn shows only:
   - System instructions about task completion requirements
   - Summaries of completed tasks for context
   - Current task that needs attention (in-progress or next pending)
   - Remaining upcoming tasks
   - Progress indicator and continuation warnings
3. **Enforces completion**: Adds strong warnings ("YOU MUST CONTINUE") until all tasks are marked as completed
4. **Prevents early termination**: Only allows the agent to finish once all tasks show status "completed"
5. **Updates in real-time**: The UI shows tasks being created and completed

**How it works:**
- **First turn**: Original user prompt is preserved so the agent can see initial instructions
- **After first task created**: Message history is completely replaced with focused task context
- **Each subsequent turn**: Shows only relevant information (not full conversation history)
- **Final turn**: Once all tasks are completed, allows agent to provide a summary

## Example Workflows

### Adaptive Planning

```typescript
await runPrompt(
  async ({ defDynamicTaskList, $ }) => {
    defDynamicTaskList();

    return $`You are debugging a memory leak in an application.

    Start by creating initial investigation tasks. As you complete
    each task, add new tasks based on what you discover. Adapt your
    approach as you learn more about the issue.`;
  },
  { model: 'openai:gpt-4' }
);
```

### Multi-Phase Projects

```typescript
await runPrompt(
  async ({ defDynamicTaskList, $ }) => {
    defDynamicTaskList();

    return $`You are managing a website redesign project with 4 phases:

    1. Research & Planning
    2. Design
    3. Development
    4. Testing & Launch

    Start by creating tasks for Phase 1. After completing Phase 1,
    create Phase 2 tasks based on the results. Continue through all
    phases, adapting the plan as needed.`;
  },
  { model: 'openai:gpt-4' }
);
```

### Task Refinement

```typescript
await runPrompt(
  async ({ defDynamicTaskList, $ }) => {
    defDynamicTaskList();

    return $`You are organizing a team event.

    1. Create an initial task list with 5 tasks
    2. Review and delete non-essential tasks
    3. Update remaining tasks to be more specific
    4. Add any missing critical tasks
    5. Complete all final tasks`;
  },
  { model: 'openai:gpt-4' }
);
```

## Comparison with Static Task List

| Feature | Static `defTaskList` | Dynamic `defDynamicTaskList` |
|---------|---------------------|----------------------------|
| Task Definition | All upfront | Create during execution |
| Validation | Required per task | Optional (manual) |
| Task Updates | Not possible | Update pending tasks |
| Task Deletion | Not possible | Delete pending tasks |
| Agent Control | Limited | Full control |
| Best For | Fixed workflows | Adaptive workflows |

## Best Practices

1. **Start tasks before completing**: Use `startTask` to mark a task as in-progress before working on it
2. **Provide detailed results**: When completing tasks, provide comprehensive results for context
3. **Create tasks early**: The agent should create all initial tasks in the first turn before starting work
4. **Work sequentially**: Complete one task before starting the next to maintain focus
5. **Be strategic with updates**: Update task descriptions when you discover better approaches
6. **Clean up unnecessary tasks**: Delete tasks that are no longer relevant (only pending tasks)
7. **Create granular tasks**: Break complex work into smaller, manageable tasks
8. **Add tasks as you discover them**: Don't try to plan everything upfront - add new tasks during execution
9. **Trust the system**: The context management will keep the agent focused on completion

## Error Handling

The tools provide clear error messages for invalid operations:

- Cannot update/delete completed or in-progress tasks
- Cannot start/complete non-existent tasks
- Cannot complete tasks that haven't been started (warning only)

## UI Display

The terminal UI shows:

- Real-time task creation and completion
- Progress indicators (e.g., "3/7 tasks completed")
- Visual distinction between task statuses (✓ completed, → in-progress, ○ pending)
- Task IDs for easy reference
- Completion celebration when all tasks are done

## Tips for Prompting

When using dynamic task lists, your prompts should:

1. **Be clear about expectations**: Tell the agent what they're working toward
2. **Encourage adaptive behavior**: Ask them to create tasks as they discover needs
3. **Request progress updates**: Have them use `getTaskList` to check status
4. **Allow flexibility**: Don't over-constrain the approach

Example prompt structure:
```
You are a [role].

Your goal: [high-level objective]

Approach:
1. Create initial tasks for [phase]
2. Complete tasks systematically
3. Add new tasks as you discover requirements
4. Update tasks if you find better approaches
5. Provide detailed results for each completed task
```

## Advanced Usage

### Combining with Other Features

You can combine dynamic task lists with other GenAgent features:

```typescript
await runPrompt(
  async ({ defDynamicTaskList, defTool, def, $ }) => {
    defDynamicTaskList();

    // Define custom tools for the agent to use
    defTool('checkBudget', 'Check project budget', schema, handler);

    // Define variables
    def('PROJECT_NAME', 'E-commerce Platform');

    return $`Plan and execute tasks for $PROJECT_NAME.
             Use checkBudget to verify costs before creating expensive tasks.`;
  },
  {
    model: 'openai:gpt-4',
    system: ['You are a project manager with budget constraints.']
  }
);
```

### With Plugins

```typescript
import { definePlugin } from 'genagent';

const budgetPlugin = definePlugin({
  name: 'Budget Tracker',
  system: 'Track and manage project budgets',
  tools: [
    tool('checkBudget', 'Check remaining budget', schema, handler),
    tool('allocateBudget', 'Allocate budget to task', schema, handler)
  ]
});

await runPrompt(
  async ({ defDynamicTaskList, $ }) => {
    defDynamicTaskList();
    return $`Create and manage project tasks within budget constraints.`;
  },
  {
    model: 'openai:gpt-4',
    plugins: [budgetPlugin]
  }
);
```

## Limitations

1. **No built-in validation**: Unlike static task lists, there's no automatic validation of task results. The agent decides when a task is complete.
2. **Task order flexibility**: Tasks can be completed in any order - there's no enforcement of sequential execution.
3. **No task dependencies**: The system doesn't track dependencies between tasks.
4. **Manual quality control**: You may want to add custom validation tools if quality control is critical.

## Future Enhancements

Potential future improvements could include:

- Optional validation functions for tasks
- Task dependencies and prerequisites
- Task priorities and deadlines
- Task assignment to different sub-agents
- Task templates and categories
- Batch operations on tasks

## Examples

See `/examples/dynamic-task-list.ts` for comprehensive examples including:

- Basic dynamic task list usage
- Task updates and modifications
- Task refinement and deletion
- Adaptive task planning
- Multi-phase projects
- Status checking workflows
