import { Injectable, signal } from '@angular/core';
import { VideoCheckpoint } from '../models';

type AnswerResult = 'correct' | 'wrong' | null;
type VideoModalType = 'question' | 'helper' | 'info' | null;

interface VideoModalHandlers {
  onSelectOption: (option: string) => void;
  onConfirmAnswer: () => void;
  onRetryQuestion: () => void;
  onHelperContinue: () => void;
  onCloseInfo: () => void;
  onResetProgress: () => void;
}

export interface VideoModalState {
  open: boolean;
  type: VideoModalType;
  checkpoint: VideoCheckpoint | null;
  selectedOption: string | null;
  answerResult: AnswerResult;
  canResetProgress: boolean;
}

@Injectable({ providedIn: 'root' })
export class VideoModalService {
  state = signal<VideoModalState>({
    open: false,
    type: null,
    checkpoint: null,
    selectedOption: null,
    answerResult: null,
    canResetProgress: false,
  });

  private handlers: VideoModalHandlers | null = null;

  registerHandlers(handlers: VideoModalHandlers) {
    this.handlers = handlers;
  }

  clearHandlers() {
    this.handlers = null;
    this.close();
  }

  openQuestion(checkpoint: VideoCheckpoint, selectedOption: string | null, answerResult: AnswerResult) {
    this.state.set({
      open: true,
      type: 'question',
      checkpoint,
      selectedOption,
      answerResult,
      canResetProgress: false,
    });
  }

  openHelper(checkpoint: VideoCheckpoint) {
    this.state.set({
      open: true,
      type: 'helper',
      checkpoint,
      selectedOption: null,
      answerResult: null,
      canResetProgress: false,
    });
  }

  openInfo(canResetProgress: boolean) {
    this.state.set({
      open: true,
      type: 'info',
      checkpoint: null,
      selectedOption: null,
      answerResult: null,
      canResetProgress,
    });
  }

  updateQuestionResult(selectedOption: string | null, answerResult: AnswerResult) {
    this.state.update((current) => ({
      ...current,
      selectedOption,
      answerResult,
    }));
  }

  close() {
    this.state.set({
      open: false,
      type: null,
      checkpoint: null,
      selectedOption: null,
      answerResult: null,
      canResetProgress: false,
    });
  }

  selectOption(option: string) {
    this.handlers?.onSelectOption(option);
  }

  confirmAnswer() {
    this.handlers?.onConfirmAnswer();
  }

  retryQuestion() {
    this.handlers?.onRetryQuestion();
  }

  helperContinue() {
    this.handlers?.onHelperContinue();
  }

  closeInfo() {
    this.handlers?.onCloseInfo();
  }

  resetProgress() {
    this.handlers?.onResetProgress();
  }
}
