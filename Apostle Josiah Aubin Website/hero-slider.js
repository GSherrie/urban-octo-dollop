const hero = document.querySelector('.hero-slider');
if (hero) {
  const slides = Array.from(hero.querySelectorAll('.hero-slide'));
  const dots = Array.from(hero.querySelectorAll('.hero-dot'));
  const intervalMs = 8000;
  let index = 0;
  let timer = null;

  slides.forEach((slide) => {
    const bg = slide.getAttribute('data-bg');
    if (bg) {
      slide.style.backgroundImage = `url('${bg}')`;
    }
  });

  const setActive = (nextIndex) => {
    slides[index].classList.remove('active');
    if (dots[index]) dots[index].classList.remove('active');
    index = nextIndex;
    slides[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');
  };

  const nextSlide = () => {
    const nextIndex = (index + 1) % slides.length;
    setActive(nextIndex);
  };

  const start = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(nextSlide, intervalMs);
  };

  dots.forEach((dot, dotIndex) => {
    dot.addEventListener('click', () => {
      setActive(dotIndex);
      start();
    });
  });

  start();
}
