import { runPrompt } from '../src/index.js';

/**
 * Example showing basic dynamic task list usage
 */
async function basicDynamicTaskListExample() {
  console.log('=== Basic Dynamic Task List Example ===\n');

  const result = await runPrompt(
    async ({ defDynamicTaskList, $ }) => {
      defDynamicTaskList();

      return $`You are a project planner for building a simple calculator app.

Your task:
1. Create a task list for the project
2. Start and complete each task one by one
3. Add new tasks as you discover them
4. Provide brief results for each completed task

Use the following tools:
- createTask: Add new tasks
- startTask: Begin working on a task
- completeTask: Mark a task as done with results
- getTaskList: View current status`;
    },
    {
      model: 'large',
      system: ['You are a software project planner.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example showing task updates and modifications
 */
async function dynamicTaskUpdateExample() {
  console.log('\n\n=== Dynamic Task Update Example ===\n');

  const result = await runPrompt(
    async ({ defDynamicTaskList, $ }) => {
      defDynamicTaskList();

      return $`You are planning a research project on renewable energy.

Your task:
1. Create an initial task list with 3-4 tasks
2. View the task list
3. Update at least one task description to be more specific
4. Add 2 more tasks based on your research needs
5. Complete all tasks systematically

For each task completion, provide a brief summary of what you accomplished.`;
    },
    {
      model: 'large',
      system: ['You are a research coordinator.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example showing task deletion and refinement
 */
async function taskRefinementExample() {
  console.log('\n\n=== Task Refinement Example ===\n');

  const result = await runPrompt(
    async ({ defDynamicTaskList, $ }) => {
      defDynamicTaskList();

      return $`You are organizing a team event.

Your task:
1. Create an initial task list with 5 tasks
2. Review the tasks and delete any that are not essential
3. Update remaining tasks to be more specific
4. Add any missing critical tasks
5. Complete all final tasks

Be thoughtful about which tasks are truly necessary.`;
    },
    {
      model: 'large',
      system: ['You are an event organizer.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example showing adaptive task planning
 */
async function adaptiveTaskPlanningExample() {
  console.log('\n\n=== Adaptive Task Planning Example ===\n');

  const result = await runPrompt(
    async ({ defDynamicTaskList, $ }) => {
      defDynamicTaskList();

      return $`You are debugging a software application that has a memory leak.

Your task:
1. Create initial investigation tasks
2. As you complete each task, add new tasks based on what you discover
3. Update tasks if you find better approaches
4. Continue until you identify the root cause

Simulate discovering information at each step and adapting your task list accordingly.
For task results, provide realistic debugging findings.`;
    },
    {
      model: 'large',
      system: ['You are a senior software engineer specializing in debugging.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example showing multi-phase project with dynamic planning
 */
async function multiPhaseProjectExample() {
  console.log('\n\n=== Multi-Phase Project Example ===\n');

  const result = await runPrompt(
    async ({ defDynamicTaskList, $ }) => {
      defDynamicTaskList();

      return $`You are managing a website redesign project.

The project has these phases:
- Phase 1: Research & Planning
- Phase 2: Design
- Phase 3: Development
- Phase 4: Testing & Launch

Your task:
1. Start by creating tasks for Phase 1
2. Complete Phase 1 tasks
3. Based on Phase 1 results, create Phase 2 tasks
4. Continue through all phases, creating new tasks as needed
5. Adapt the plan based on "findings" from completed tasks

Provide realistic results for each completed task.`;
    },
    {
      model: 'large',
      system: ['You are a web project manager.'],
    }
  );

  console.log('\nFinal result:', result);
}

/**
 * Example showing task list status checking
 */
async function statusCheckingExample() {
  console.log('\n\n=== Status Checking Example ===\n');

  const result = await runPrompt(
    async ({ defDynamicTaskList, $ }) => {
      defDynamicTaskList();

      return $`You are conducting code review tasks.

Your task:
1. Create 4 code review tasks
2. Check the task list status using getTaskList
3. Start the first task
4. Check status again
5. Complete the first task
6. Check status again to see progress
7. Complete remaining tasks

Use getTaskList frequently to monitor your progress.`;
    },
    {
      model: 'large',
      system: ['You are a code reviewer.'],
    }
  );

  console.log('\nFinal result:', result);
}

// Run examples
async function main() {
  try {
    // Comment out examples you don't want to run
    await basicDynamicTaskListExample();
    // await dynamicTaskUpdateExample();
    // await taskRefinementExample();
    // await adaptiveTaskPlanningExample();
    // await multiPhaseProjectExample();
    // await statusCheckingExample();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
