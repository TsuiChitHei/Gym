import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { DiscardWorkoutModal } from '../../components/DiscardWorkoutModal';
import { EndWorkoutModal } from '../../components/EndWorkoutModal';
import { ExerciseRecapForm } from '../../components/ExerciseRecapForm';
import { ExerciseSelectForm, type ExerciseSelection } from '../../components/ExerciseSelectForm';
import { ManualWorkoutSetupForm } from '../../components/ManualWorkoutSetupForm';
import { SessionSetupForm } from '../../components/SessionSetupForm';
import { SetLoggingForm } from '../../components/SetLoggingForm';
import { WorkoutTimer } from '../../components/WorkoutTimer';
import { colors } from '../../constants/theme';
import { saveWorkout, updateWorkout } from '../../db/repositories/workouts';
import type { ExerciseDraft, SetDraft, WorkoutDraft, WorkoutFlowStep } from '../../types';

interface WorkoutFlowProps {
  mode: 'live' | 'manual';
  initialStep?: WorkoutFlowStep;
  initialDraft?: WorkoutDraft;
  onFinished: () => void;
  onCancel: () => void;
}

function selectionFromExercise(exercise: ExerciseDraft): ExerciseSelection {
  return {
    machineId: exercise.machineId,
    machineModeId: exercise.machineModeId,
    machineName: exercise.machineName,
    brandName: exercise.brandName,
    modeName: exercise.modeName,
  };
}

function initialStepForDraft(draft: WorkoutDraft | undefined, fallback: WorkoutFlowStep): WorkoutFlowStep {
  if (draft && draft.exercises.length > 0) return 'exercise-recap';
  return fallback;
}

export function WorkoutFlow({
  mode,
  initialStep,
  initialDraft,
  onFinished,
  onCancel,
}: WorkoutFlowProps) {
  const fallbackStep =
    initialStep ?? (mode === 'manual' ? 'manual-session-setup' : 'session-setup');

  const [step, setStep] = useState<WorkoutFlowStep>(
    initialDraft
      ? initialStepForDraft(initialDraft, fallbackStep)
      : fallbackStep,
  );
  const [draft, setDraft] = useState<WorkoutDraft | null>(initialDraft ?? null);
  const [currentSelection, setCurrentSelection] = useState<ExerciseSelection | null>(null);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [discardMessage, setDiscardMessage] = useState<string | undefined>(undefined);
  const [showEndModal, setShowEndModal] = useState(false);
  const [pendingExercises, setPendingExercises] = useState<ExerciseDraft[] | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditingExisting = draft?.id != null;
  const exerciseCount = (draft?.exercises.length ?? 0) + 1;

  const hasAnyCompletedSets = (exercises: ExerciseDraft[]) =>
    exercises.some((exercise) => exercise.sets.length > 0);

  const requestDiscardWorkout = () => {
    const hasExercises = (draft?.exercises.length ?? 0) > 0;
    setDiscardMessage(
      hasExercises
        ? 'Discard this workout? All logged exercises will be lost.'
        : undefined,
    );
    setShowDiscardModal(true);
  };

  const requestEndWorkout = (exercises: ExerciseDraft[]) => {
    if (!hasAnyCompletedSets(exercises)) {
      requestDiscardWorkout();
      return;
    }
    setPendingExercises(exercises);
    setShowEndModal(true);
  };

  const finalizeWorkout = async (exercises: ExerciseDraft[]) => {
    if (!draft) return;
    setSaving(true);
    try {
      const endedAt = draft.isManual
        ? new Date(draft.startedAt.getTime() + (draft.durationSeconds ?? 0) * 1000)
        : draft.endedAt ?? new Date();

      const payload: WorkoutDraft = {
        ...draft,
        exercises,
        endedAt,
        durationSeconds: draft.isManual
          ? draft.durationSeconds
          : Math.floor((endedAt.getTime() - draft.startedAt.getTime()) / 1000),
      };

      if (draft.id != null) {
        await updateWorkout(draft.id, payload);
      } else {
        await saveWorkout(payload);
      }
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
    setEditingExerciseIndex(null);
    setCurrentSelection(selection);
    setStep('set-logging');
  };

  const handleEditExercise = (index: number) => {
    if (!draft) return;
    const exercise = draft.exercises[index];
    if (!exercise) return;
    setEditingExerciseIndex(index);
    setCurrentSelection(selectionFromExercise(exercise));
    setStep('set-logging');
  };

  const handleDeleteExercise = (index: number) => {
    if (!draft) return;
    const updatedExercises = draft.exercises.filter((_, i) => i !== index);
    setDraft({ ...draft, exercises: updatedExercises });
  };

  const applySetsToDraft = (sets: SetDraft[]): ExerciseDraft[] | null => {
    if (!draft || !currentSelection) return null;

    const exercise: ExerciseDraft = {
      machineId: currentSelection.machineId,
      machineModeId: currentSelection.machineModeId,
      machineName: currentSelection.machineName,
      brandName: currentSelection.brandName,
      modeName: currentSelection.modeName,
      sets: sets.map((set, index) => ({ ...set, setNumber: index + 1 })),
    };

    const updatedExercises = [...draft.exercises];
    if (editingExerciseIndex != null) {
      if (sets.length === 0) {
        updatedExercises.splice(editingExerciseIndex, 1);
      } else {
        updatedExercises[editingExerciseIndex] = exercise;
      }
    } else if (sets.length > 0) {
      updatedExercises.push(exercise);
    }

    setDraft({ ...draft, exercises: updatedExercises });
    return updatedExercises;
  };

  const handleDoneFromSets = (sets: SetDraft[]) => {
    applySetsToDraft(sets);
    setCurrentSelection(null);
    setEditingExerciseIndex(null);
    setStep('exercise-recap');
  };

  const handleCancelExerciseSelect = () => {
    if (isEditingExisting || (draft?.exercises.length ?? 0) > 0) {
      setStep('exercise-recap');
      return;
    }
    requestDiscardWorkout();
  };

  const handleSaveChanges = () => {
    if (!draft) return;
    void finalizeWorkout(draft.exercises);
  };

  const handleBackFromSets = () => {
    setCurrentSelection(null);
    setEditingExerciseIndex(null);
    if ((draft?.exercises.length ?? 0) > 0 || editingExerciseIndex != null) {
      setStep('exercise-recap');
    } else {
      setStep('exercise-select');
    }
  };

  if (step === 'session-setup') {
    return <SessionSetupForm onStart={handleLiveSessionStart} onCancel={onCancel} />;
  }

  if (step === 'manual-session-setup') {
    return <ManualWorkoutSetupForm onStart={handleManualSessionStart} onCancel={onCancel} />;
  }

  return (
    <View style={styles.container}>
      {draft ? (
        <WorkoutTimer
          startedAt={draft.startedAt}
          isManual={draft.isManual || isEditingExisting}
          durationSeconds={draft.durationSeconds}
        />
      ) : null}

      {step === 'exercise-recap' && draft ? (
        <ExerciseRecapForm
          exercises={draft.exercises}
          mode={isEditingExisting ? 'editing' : 'logging'}
          onEditExercise={handleEditExercise}
          onDeleteExercise={handleDeleteExercise}
          onNewExercise={() => setStep('exercise-select')}
          onEndWorkout={() => requestEndWorkout(draft.exercises)}
          onSaveChanges={handleSaveChanges}
          onDiscardWorkout={requestDiscardWorkout}
        />
      ) : null}

      {step === 'exercise-select' ? (
        <ExerciseSelectForm
          exerciseNumber={Math.max(1, exerciseCount)}
          onStart={handleExerciseStart}
          onCancel={handleCancelExerciseSelect}
        />
      ) : null}

      {step === 'set-logging' && currentSelection ? (
        <SetLoggingForm
          key={
            editingExerciseIndex != null
              ? `edit-${editingExerciseIndex}`
              : `new-${currentSelection.machineId}-${currentSelection.machineModeId ?? 'none'}`
          }
          machineName={currentSelection.machineName}
          brandName={currentSelection.brandName}
          modeName={currentSelection.modeName}
          initialSets={
            editingExerciseIndex != null ? draft?.exercises[editingExerciseIndex]?.sets : undefined
          }
          isEditing={editingExerciseIndex != null}
          onDone={handleDoneFromSets}
          onBack={handleBackFromSets}
        />
      ) : null}

      <DiscardWorkoutModal
        visible={showDiscardModal}
        message={discardMessage}
        onCancel={() => setShowDiscardModal(false)}
        onConfirm={() => {
          setShowDiscardModal(false);
          onCancel();
        }}
      />

      <EndWorkoutModal
        visible={showEndModal}
        exerciseCount={pendingExercises?.length ?? draft?.exercises.length ?? 0}
        onCancel={() => {
          setShowEndModal(false);
          setPendingExercises(null);
        }}
        onConfirm={() => {
          setShowEndModal(false);
          const exercises = pendingExercises ?? draft?.exercises ?? [];
          setPendingExercises(null);
          void finalizeWorkout(exercises);
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
