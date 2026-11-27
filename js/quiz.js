import { attachRunaway } from './runawayButton.js';
import { sfx } from './sfx.js';

/**
 * Controls the exact two-question gate. The quiz is for fun, not security.
 * @param {Array} questions
 * @param {() => void} onComplete
 * @param {object} [runaway]  cardConfig.runawayWrongAnswer settings (wrong answers dodge before they can be picked)
 */
export function createQuiz(questions, onComplete, runaway = { enabled: false }) {
  const card = document.querySelector('.quiz-card');
  const counter = document.getElementById('questionCounter');
  const title = document.getElementById('questionText');
  const answers = document.getElementById('answerList');
  const feedback = document.getElementById('answerFeedback');
  const back = document.getElementById('backButton');
  let index = 0;
  let locked = false;
  let pendingAdvance = null;
  let runaways = [];

  function stopRunaways() {
    for (const item of runaways) item.destroy();
    runaways = [];
  }

  function render() {
    const q = questions[index];
    locked = false;
    stopRunaways();
    counter.textContent = `Question ${index + 1} of ${questions.length}`;
    title.textContent = q.text;
    feedback.textContent = '';
    back.hidden = index === 0;
    answers.replaceChildren();

    const buttons = q.options.map(option => {
      const button = document.createElement('button');
      button.className = 'answer-button';
      button.type = 'button';
      button.textContent = option;
      button.addEventListener('click', () => selectAnswer(option, button));
      answers.appendChild(button);
      return button;
    });
    if (runaway.enabled) setUpRunaways(q, buttons);
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
  }

  /** Every wrong option runs away; it must never cover the question, other answers or the controls. */
  function setUpRunaways(q, buttons) {
    const correctButton = buttons[q.options.indexOf(q.correctAnswer)];
    buttons.forEach((button, i) => {
      if (q.options[i] === q.correctAnswer) return;
      const others = buttons.filter(other => other !== button);
      runaways.push(attachRunaway(button, card, {
        giveUpAfter: runaway.giveUpAfter,
        avoid: () => [...others, title, feedback, back, counter],
        onDodge(count, { tired, pointerType }) {
          sfx.play('dodge');
          const messages = runaway.messages ?? [];
          if (messages.length) feedback.textContent = messages[Math.min(count, messages.length) - 1];
          if (runaway.hintAfter > 0 && count >= runaway.hintAfter) correctButton?.classList.add('is-hinted');
          if (runaway.vibrate && pointerType === 'touch') navigator.vibrate?.(35);
          if (tired) button.setAttribute('title', 'Too tired to run any more');
        },
      }));
    });
  }

  function selectAnswer(option, button) {
    if (locked) return;
    const correct = option === questions[index].correctAnswer;
    if (!correct) {
      sfx.play('wrong');
      button.classList.add('incorrect');
      feedback.textContent = 'Not quite — try again.';
      window.setTimeout(() => button.classList.remove('incorrect'), 500);
      return;
    }
    locked = true;
    sfx.play('correct');
    stopRunaways();
    button.classList.add('correct');
    feedback.textContent = 'You got it.';
    for (const item of answers.querySelectorAll('button')) item.disabled = true;
    pendingAdvance = window.setTimeout(() => {
      pendingAdvance = null;
      if (index < questions.length - 1) {
        index++;
        render();
      } else {
        onComplete();
      }
    }, 650);
  }

  back.addEventListener('click', () => {
    if (pendingAdvance !== null) window.clearTimeout(pendingAdvance);
    pendingAdvance = null;
    if (index > 0) {
      sfx.play('tap');
      index -= 1;
      render();
    }
  });

  return {
    start() { index = 0; render(); },
    cancel() {
      if (pendingAdvance !== null) window.clearTimeout(pendingAdvance);
      pendingAdvance = null;
      stopRunaways();
    },
  };
}
