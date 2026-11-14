// Intro and hero share admission, so hidden movies never compete for bandwidth.
let finished = false;
const listeners = new Set<() => void>();
export const subscribeIntro = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
};
export const isIntroFinished = () => finished;
export const introServerSnapshot = () => false;
export function setIntroActive(active: boolean) {
    finished = !active;
    listeners.forEach(listener => listener());
}
