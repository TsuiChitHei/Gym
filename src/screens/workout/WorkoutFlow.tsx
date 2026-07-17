import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { DiscardWorkoutModal } from '../../components/DiscardWorkoutModal';
import { ExerciseSelectForm, type ExerciseSelection } from '../../components/ExerciseSelectForm';
import { ManualWorkoutSetupForm } from '../../components/ManualWorkoutSetupForm';
import { SessionSetupForm } from '../../components/SessionSetupForm';
import { SetLoggingForm } from '../../components/SetLoggingForm';
import { WorkoutTimer } from '../../components/WorkoutTimer';
import { colors } from '../../constants/theme';
import { saveWorkout } from '../../db/repositories/workouts';
import type { ExerciseDraft, SetDraft, WorkoutDraft, WorkoutFlowStep } from '../../types';

interface WorkoutFlowProps {
  mode: 'live' | 'manual';
  initialStep?: WorkoutFlowStep;
  onFinished: () => void;
  onCancel: () => void;
}

export function WorkoutFlow({ mode, initialStep, onFinished, onCancel }: WorkoutFlowProps) {
  const [step, setStep] = useState<WorkoutFlowStep>(
    initialStep ?? (mode === 'manual' ? 'manual-session-setup' : 'session-setup'),
  );
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [currentSelection, setCurrentSelection] = useState<ExerciseSelection | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [pendingEndAction, setPendingEndAction] = useState<(() => void) | null>(null);
  const [saving, setSaving] = useState(false);

  const exerciseCount = (draft?.exercises.length ?? 0) + (step === 'exercise-select' ? 1 : 0);

  const hasAnyCompletedSets = (exercises: ExerciseDraft[]) =>
    exercises.some((exercise) => exercise.sets.length > 0);

  const requestEndWorkout = (exercises: ExerciseDraft[]) => {
    if (!hasAnyCompletedSets(exercises)) {
      setPendingEndAction(() => () => onCancel());
      setShowDiscardModal(true);
      return;
    }
    finalizeWorkout(exercises);
  };

  const finalizeWorkout = async (exercises: ExerciseDraft[]) => {
    if (!draft) return;
    setSaving(true);
    try {
      const endedAt = draft.isManual
        ? new Date(draft.startedAt.getTime() + (draft.durationSeconds ?? 0) * 1000)
        : new Date();

      await saveWorkout({
        ...draft,
        exercises,
        endedAt,
        durationSeconds: draft.isManual
          ? draft.durationSeconds
          : Math.floor((endedAt.getTime() - draft.startedAt.getTime()) / 1000),
      });
      onFinished();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save workout.');
    } finally {
      setSaving(false);
    }
  };

  const handleLiveSessionStart = (workoutName: string, location: string) => {
    setDraft({
      workoutName,
      location,
      startedAt: new Date(),
      exercises: [],
      isManual: false,
    });
    setStep('exercise-select');
  };

  const handleManualSessionStart = (params: {
    workoutName: string;
    location: string;
    date: Date;
    durationSeconds: number;
  }) => {
    setDraft({
      workoutName: params.workoutName,
      location: params.location,
      startedAt: params.date,
      durationSeconds: params.durationSeconds,
      exercises: [],
      isManual: true,
    });
    setStep('exercise-select');
  };

  const handleExerciseStart = (selection: ExerciseSelection) => {
    setCurrentSelection(selection);
    setStep('set-logging');
  };

  const handleNextExercise = (sets: SetDraft[]) => {
    if (!draft || !currentSelection) return;

    const exercise: ExerciseDraft = {
      machineId: currentSelection.machineId,
      machineModeId: currentSelection.machineModeId,
      machineName: currentSelection.machineName,
      brandName: currentSelection.brandName,
      modeName: currentSelection.modeName,
      sets: sets.map((set, index) => ({ ...set, setNumber: index + 1 })),
    };

    const updatedExercises = [...draft.exercises];
    if (sets.length > 0) {
      updatedExercises.push(exercise);
    }

    setDraft({ ...draft, exercises: updatedExercises });
    setCurrentSelection(null);
    setStep('exercise-select');
  };

  const handleEndFromSets = (sets: SetDraft[]) => {
    if (!draft || !currentSelection) return;

    const exercises = [...draft.exercises];
    if (sets.length > 0) {
      exercises.push({
        machineId: currentSelection.machineId,
        machineModeId: currentSelection.machineModeId,
        machineName: currentSelection.machineName,
        brandName: currentSelection.brandName,
        modeName: currentSelection.modeName,
        sets: sets.map((set, index) => ({ ...set, setNumber: index + 1 })),
      });
    }

    requestEndWorkout(exercises);
  };

  const handleEndFromExerciseSelect = () => {
    requestEndWorkout(draft?.exercises ?? []);
  };

  if (step === 'session-setup') {
    return (
      <SessionSetupForm
        onStart={handleLiveSessionStart}
        onCancel={onCancel}
      />
    );
  }

  if (step === 'manual-session-setup') {
    return (
      <ManualWorkoutSetupForm
        onStart={handleManualSessionStart}
        onCancel={onCancel}
      />
    );
  }

  return (
    <View style={styles.container}>
      {draft ? (
        <WorkoutTimer
          startedAt={draft.startedAt}
          isManual={draft.isManual}
          durationSeconds={draft.durationSeconds}
        />
      ) : null}

      {step === 'exercise-select' ? (
        <ExerciseSelectForm
          exerciseNumber={exerciseCount}
          onStart={handleExerciseStart}
          onEnd={handleEndFromExerciseSelect}
        />
      ) : null}

      {step === 'set-logging' && currentSelection ? (
        <SetLoggingForm
          machineName={currentSelection.machineName}
          brandName={currentSelection.brandName}
          modeName={currentSelection.modeName}
          onNextExercise={handleNextExercise}
          onEndWorkout={handleEndFromSets}
        />
      ) : null}

      <DiscardWorkoutModal
        visible={showDiscardModal}
        onCancel={() => {
          setShowDiscardModal(false);
          setPendingEndAction(null);
        }}
        onConfirm={() => {
          setShowDiscardModal(false);
          if (pendingEndAction) {
            pendingEndAction();
          } else {
            onCancel();
          }
          setPendingEndAction(null);
        }}
      />

      {saving ? <View style={styles.savingOverlay} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});
