import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Exercise } from '../../core/models';
import { McqComponent } from './mcq/mcq.component';
import { ScrambleComponent } from './scramble/scramble.component';
import { GuidedWritingComponent } from './guided-writing/guided-writing.component';
import { SpeakingTopicComponent } from './speaking-topic/speaking-topic.component';
import { AudioMcqComponent } from './audio-mcq/audio-mcq.component';
import { VideoExerciseComponent } from './video-exercise/video-exercise.component';
import { SpeakingRecordComponent } from './speaking-record/speaking-record.component';
import { DictationComponent } from './dictation/dictation.component';

@Component({
  selector: 'app-exercise-renderer',
  standalone: true,
  imports: [
    CommonModule,
    McqComponent,
    ScrambleComponent,
    GuidedWritingComponent,
    SpeakingTopicComponent,
    AudioMcqComponent,
    DictationComponent,
    VideoExerciseComponent,
    SpeakingRecordComponent,
  ],
  templateUrl: './exercise-renderer.component.html',
})
export class ExerciseRendererComponent {
  @Input({ required: true }) exercise!: Exercise;
}
