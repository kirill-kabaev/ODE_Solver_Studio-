import React from 'react';
import { ODESolution, SolverEngine, CauchyCondition } from '../types';
import { InteractiveODEGraph } from './InteractiveODEGraph';

interface DirectionFieldGraphWindowProps {
  solution: ODESolution | null;
  isSolving: boolean;
  engine?: SolverEngine;
  currentRequestText?: string;
  attempt?: number;
  maxAttempts?: number;
  onCancel?: () => void;
  initialCauchy?: CauchyCondition | null;
}

export const DirectionFieldGraphWindow: React.FC<DirectionFieldGraphWindowProps> = ({
  solution,
  isSolving,
  engine = 'ai',
  currentRequestText,
  attempt = 1,
  maxAttempts = 3,
  onCancel,
  initialCauchy,
}) => {
  return (
    <InteractiveODEGraph
      solution={solution}
      isSolving={isSolving}
      engine={engine}
      currentRequestText={currentRequestText}
      attempt={attempt}
      maxAttempts={maxAttempts}
      onCancel={onCancel}
      initialCauchy={initialCauchy}
    />
  );
};
