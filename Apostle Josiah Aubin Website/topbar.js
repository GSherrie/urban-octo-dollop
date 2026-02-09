const topbar = document.querySelector('.topbar');
const scrollContainer = document.querySelector('.main') || window;

if (topbar) {
  let lastScrollY = scrollContainer === window ? window.scrollY : scrollContainer.scrollTop;
  let ticking = false;

  const getMaxScroll = () => {
    if (scrollContainer === window) {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }
    return Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
  };

  const update = () => {
    const currentY = scrollContainer === window ? window.scrollY : scrollContainer.scrollTop;
    const maxScroll = getMaxScroll();
    const revealThreshold = maxScroll * 0.04;
    const isNearTop = currentY <= revealThreshold;

    if (isNearTop) {
      topbar.classList.remove('topbar-hidden');
    } else if (currentY > lastScrollY) {
      topbar.classList.add('topbar-hidden');
    }
    lastScrollY = currentY;
    ticking = false;
  };

  scrollContainer.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
}
