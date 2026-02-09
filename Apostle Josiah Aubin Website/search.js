const searchInputs = document.querySelectorAll('.site-search');
if (searchInputs.length) {
  const index = [];

  const normalize = (str) => (str || '').toLowerCase().replace(/\s+/g, ' ').trim();

  const buildIndex = async () => {
    if (Array.isArray(window.SITE_SEARCH_DATA) && window.SITE_SEARCH_DATA.length) {
      window.SITE_SEARCH_DATA.forEach((item) => {
        index.push({
          page: item.page,
          title: item.title || item.page,
          rawText: item.rawText || '',
          normalized: normalize(item.rawText || '')
        });
      });
      return;
    }

    const pages = [
      'index.html',
      'sermons.html',
      'teachings.html',
      'books.html',
      'testimonies.html',
      'live.html',
      'most-watched.html'
    ];

    const fetches = pages.map(async (page) => {
      try {
        const res = await fetch(page, { cache: 'force-cache' });
        if (!res.ok) return;
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
        const title = doc.title || page;
        const bodyText = doc.body ? doc.body.textContent || '' : '';
        index.push({
          page,
          title,
          rawText: bodyText,
          normalized: normalize(bodyText)
        });
      } catch (err) {
        // Skip pages that fail to load (e.g., local file restrictions)
      }
    });

    await Promise.all(fetches);
  };

  const createResultsContainer = (input) => {
    const wrap = input.closest('.search-wrap');
    if (!wrap) return null;
    return wrap.querySelector('.search-results');
  };

  const renderResults = (container, results, query) => {
    if (!container) return;
    if (!query || results.length === 0) {
      container.classList.remove('active');
      container.innerHTML = '';
      document.body.classList.remove('search-open');
      return;
    }

    container.classList.add('active');
    document.body.classList.add('search-open');
    const items = results.map((result) => {
      const lowerRaw = result.rawText.toLowerCase();
      const idx = lowerRaw.indexOf(query);
      let snippet = result.rawText;
      if (idx >= 0) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(result.rawText.length, idx + 80);
        snippet = result.rawText.slice(start, end).replace(/\s+/g, ' ').trim();
      } else {
        snippet = result.rawText.slice(0, 120).replace(/\s+/g, ' ').trim();
      }

      return `
        <a class="search-result" href="${result.page}">
          <div class="search-result-title">${result.title}</div>
          <div class="search-result-snippet">${snippet}</div>
        </a>
      `;
    });

    container.innerHTML = items.join('');
  };

  const attachSearch = (input) => {
    const container = createResultsContainer(input);
    if (!container) return;

    let debounceId = null;

    const runSearch = (value) => {
      const query = normalize(value);
      if (query.length < 3) {
        renderResults(container, [], '');
        return;
      }

      const matches = index
        .filter((item) => item.normalized.includes(query))
        .slice(0, 7);

      renderResults(container, matches, query);
    };

    input.addEventListener('input', (e) => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => runSearch(e.target.value), 200);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = container.querySelector('.search-result');
        if (first) {
          window.location.href = first.getAttribute('href');
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target) && e.target !== input) {
        container.classList.remove('active');
        document.body.classList.remove('search-open');
      }
    });
  };

  buildIndex().then(() => {
    searchInputs.forEach((input) => attachSearch(input));
  });
}
