// cron-seo-update.js
// This script runs all SEO-related updates in sequence
// Can be set up as a cron job to run daily or weekly

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

// Promisify exec
const execAsync = promisify(exec);

// Configuration
const config = {
  logPath: './seo-updates.log',
  tasks: [
    {
      name: 'Generate Sitemaps',
      command: 'npm run generate-sitemap'
    },
    {
      name: 'Update Canonical URLs',
      command: 'npm run update-canonicals'
    },
    {
      name: 'Ping Search Engines',
      command: 'npm run ping-search-engines'
    }
  ]
};

// Function to run a command
async function runCommand(command, taskName) {
  console.log(`Running task: ${taskName}`);
  
  try {
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error(`Error in task ${taskName}:`, stderr);
      return {
        success: false,
        task: taskName,
        output: stderr,
        error: true
      };
    }
    
    console.log(`✅ Task completed: ${taskName}`);
    return {
      success: true,
      task: taskName,
      output: stdout
    };
  } catch (error) {
    console.error(`Failed to run task ${taskName}:`, error);
    return {
      success: false,
      task: taskName,
      output: error.message,
      error: true
    };
  }
}

// Function to run all tasks
async function runAllTasks() {
  console.log('Starting SEO update tasks...');
  const startTime = new Date();
  
  const results = [];
  
  for (const task of config.tasks) {
    const result = await runCommand(task.command, task.name);
    results.push(result);
    
    // If a task fails, log it but continue with other tasks
    if (!result.success) {
      console.error(`Task ${task.name} failed, continuing with next task`);
    }
  }
  
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000; // in seconds
  
  // Generate report
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  const report = {
    timestamp: new Date().toISOString(),
    duration: `${duration} seconds`,
    tasksRun: results.length,
    successCount,
    failCount,
    results
  };
  
  // Log report
  console.log('SEO update completed!');
  console.log(`Duration: ${duration} seconds`);
  console.log(`Success: ${successCount}/${results.length} tasks`);
  
  // Write report to log file
  try {
    const logContent = JSON.stringify(report, null, 2);
    fs.writeFileSync(config.logPath, logContent);
    console.log(`Report written to ${config.logPath}`);
  } catch (error) {
    console.error('Error writing report:', error);
  }
  
  return report;
}

// Run all tasks
runAllTasks();

// Export for use in other scripts
export default runAllTasks; 