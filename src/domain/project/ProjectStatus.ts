import { Project } from "./Project";
import { Workflow } from "./Workflow";

/**
 * StatusEngine is a core domain service that implements status transition logic.
 * It is fully data-driven, relying strictly on the Workflow Definition data
 * rather than hardcoded transition conditions.
 */
export class StatusEngine {
  /**
   * Retrieves the current step/status of the project.
   */
  static currentStep(project: Project): string {
    return project.currentStep || project.status;
  }

  /**
   * Calculates the next status in the workflow.
   * Returns null if already at the last step or if current status is not found.
   */
  static nextStatus(project: Project, workflow: Workflow): string | null {
    const steps = workflow.steps;
    const current = this.currentStep(project);
    const index = steps.indexOf(current);
    if (index === -1 || index >= steps.length - 1) {
      return null;
    }
    return steps[index + 1];
  }

  /**
   * Calculates the previous status in the workflow.
   * Returns null if already at the first step or if current status is not found.
   */
  static previousStatus(project: Project, workflow: Workflow): string | null {
    const steps = workflow.steps;
    const current = this.currentStep(project);
    const index = steps.indexOf(current);
    if (index <= 0) {
      return null;
    }
    return steps[index - 1];
  }

  /**
   * Determines if the project can move to a specific target status.
   * By default, returns true if the targetStatus exists in the workflow.
   * In 'strict' mode, enforces sequential movement (only next or previous steps).
   */
  static canMove(
    project: Project,
    targetStatus: string,
    workflow: Workflow,
    strict: boolean = true
  ): boolean {
    const steps = workflow.steps;
    const current = this.currentStep(project);
    const currentIndex = steps.indexOf(current);
    const targetIndex = steps.indexOf(targetStatus);

    // Target step must exist in the workflow
    if (targetIndex === -1) {
      return false;
    }

    // If current status is legacy / not in workflow, allow transition to migrate the project
    if (currentIndex === -1) {
      return true;
    }

    if (strict) {
      // In strict sequential mode, can only move to adjacent steps
      return Math.abs(targetIndex - currentIndex) === 1;
    }

    // In flexible mode, can jump to any defined step in the workflow
    return true;
  }
}
