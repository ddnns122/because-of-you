// Frame-rate independent motion shared by wheel, swipe and long-press input.
export const BASE_SPEED = 0.16;
export const HOLD_SPEED = 0.95;
export function advance(state, dt, reduced = false) {
  dt = Math.min(Math.max(dt, 0), 0.05);
  const desired = state.held ? HOLD_SPEED : (reduced ? 0 : BASE_SPEED);
  state.speed += (desired - state.speed) * (1 - Math.exp(-dt * 4.5));
  state.impulse *= Math.exp(-dt * 3.8);
  state.offset += (state.speed + state.impulse) * dt;
  return state;
}
