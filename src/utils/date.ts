import { DateTime } from 'luxon'

export function getOnlyDateWithoutHours() {
  // Obtener la hora actual de Buenos Aires
  const desiredDate = DateTime.now().setZone('America/Argentina/Buenos_Aires')
  return desiredDate!
}

export function isMorning() {
  const currentHour = DateTime.now().setZone(
    'America/Argentina/Buenos_Aires',
  ).hour
  return currentHour >= 0 && currentHour < 11
}

export class TimeEstimator {
  totalSteps: number;
  completedSteps: number;
  totalElapsedTime: number;
  startTime: number | null;
  currentStepElapsedTime: number;

  constructor(totalSteps: number) {
    this.totalSteps = totalSteps;
    this.completedSteps = 0;
    this.totalElapsedTime = 0;
    this.startTime = null;
    this.currentStepElapsedTime = 0;
  }

  startStep(): void {
    this.startTime = Date.now();
  }

  endStep(): void {
    if (this.startTime === null) {
      throw new Error("startStep must be called before endStep");
    }
    const endTime = Date.now();
    this.currentStepElapsedTime = endTime - this.startTime;
    this.totalElapsedTime += this.currentStepElapsedTime;
    this.completedSteps += 1;
    this.startTime = null;
    this.logStepCompletion();
  }

  getAverageStepTime(): number {
    return this.totalElapsedTime / this.completedSteps;
  }

  getEstimatedRemainingTime(): number {
    const remainingSteps = this.totalSteps - this.completedSteps;
    const averageStepTime = this.getAverageStepTime();
    return averageStepTime * remainingSteps;
  }

  formatTime(ms: number): { minutes: number; seconds: string } {
    const totalSeconds = (ms / 1000).toFixed(2);
    const minutes = Math.floor(Number(totalSeconds) / 60);
    const seconds = (Number(totalSeconds) % 60).toFixed(2);
    return { minutes, seconds };
  }

  logStepCompletion(): void {
    const { minutes, seconds } = this.formatTime(this.currentStepElapsedTime);
    console.info(`Step ${this.completedSteps}/${this.totalSteps} completed in ${minutes} minutes and ${seconds} seconds`);
  }

  logEstimatedRemainingTime(): void {
    const estimatedRemainingTime = this.getEstimatedRemainingTime();
    const { minutes: estMinutes, seconds: estSeconds } = this.formatTime(estimatedRemainingTime);
    console.info(`Estimated remaining time: ${estMinutes} minutes and ${estSeconds} seconds`);
  }
}