(function () {
  'use strict';

  /* =========================================================
     STORAGE HELPERS
  ========================================================= */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }
  };

  const KEYS = {
    favMovies: 'cineverse_fav_movies',
    favSongs: 'cineverse_fav_songs',
    watchLater: 'cineverse_watch_later',
    playlist: 'cineverse_playlist',
    theme: 'cineverse_theme',
    recentSongs: 'cineverse_recent_songs',
    recentMovies: 'cineverse_recent_movies',
    volume: 'cineverse_volume'
  };

  /* =========================================================
     STATE
  ========================================================= */
  const state = {
    favMovies: store.get(KEYS.favMovies, []),
    favSongs: store.get(KEYS.favSongs, []),
    watchLater: store.get(KEYS.watchLater, []),
    playlist: store.get(KEYS.playlist, []),
    recentSongs: store.get(KEYS.recentSongs, []),
    recentMovies: store.get(KEYS.recentMovies, [])
  };

  /* =========================================================
     ELEMENT REFERENCES
  ========================================================= */
  const navbar = document.getElementById('navbar');
  const modal = document.getElementById('trailerModal');
  const videoWrapper = document.getElementById('videoWrapper');
  const modalTitle = document.getElementById('modalTitle');
  const closeBtn = document.getElementById('closeModalBtn');

  const audio = document.getElementById('audioPlayer');
  const songList = document.getElementById('songList');
  const nowBar = document.getElementById('nowPlayingBar');
  const npCover = document.getElementById('npCover');
  const npTitle = document.getElementById('npTitle');
  const npArtist = document.getElementById('npArtist');
  const npCurrent = document.getElementById('npCurrent');
  const npDuration = document.getElementById('npDuration');
  const progressFill = document.getElementById('progressFill');
  const progressTrack = document.getElementById('progressTrack');
  const npToggle = document.getElementById('npToggle');
  const npPrev = document.getElementById('npPrev');
  const npNext = document.getElementById('npNext');
  const npClose = document.getElementById('npClose');
  const npVolume = document.getElementById('npVolume');
  const npMute = document.getElementById('npMute');

  const searchOverlay = document.getElementById('searchOverlay');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const clearSearch = document.getElementById('clearSearch');
  const openSearchBtn = document.getElementById('openSearch');
  const closeSearchBtn = document.getElementById('closeSearch');

  const themeToggle = document.getElementById('themeToggle');
  const surpriseBtn = document.getElementById('surpriseBtn');
  const toastContainer = document.getElementById('toastContainer');
  const backToTop = document.getElementById('backToTop');

  const favMoviesEl = document.getElementById('favMovies');
  const favSongsEl = document.getElementById('favSongs');
  const favWatchLaterEl = document.getElementById('favWatchLater');
  const favPlaylistEl = document.getElementById('favPlaylist');
  const favEmptyEl = document.getElementById('favEmpty');
  const favCountEl = document.getElementById('favCount');

  const DUNE_TRAILER = 'Way9Dexny3w';

  let currentIndex = -1;
  let isPlaying = false;

  /* Helper getters (dynamic — reflects DOM even after re-render) */
  const getMovieCards = () => Array.from(document.querySelectorAll('.movie-card'));
  const getSongItems = () => Array.from(songList.querySelectorAll('.song-item'));

  /* =========================================================
     TOASTS
  ========================================================= */
  function toast(message, type = 'info', icon = 'fa-circle-info') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<i class="fas ' + icon + '"></i><span>' + message + '</span>';
    toastContainer.appendChild(el);
    setTimeout(() => {
      el.classList.add('hide');
      setTimeout(() => el.remove(), 320);
    }, 2400);
  }

  /* =========================================================
     NAVBAR SCROLL
  ========================================================= */
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
    backToTop.classList.toggle('visible', window.scrollY > 600);
  });

  /* =========================================================
     THEME TOGGLE
  ========================================================= */
  function applyTheme(theme) {
    document.body.classList.toggle('light-theme', theme === 'light');
    themeToggle.innerHTML = theme === 'light'
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }
  const savedTheme = store.get(KEYS.theme, 'dark');
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light-theme');
    const next = isLight ? 'dark' : 'light';
    applyTheme(next);
    store.set(KEYS.theme, next);
    toast('Switched to ' + next + ' theme', 'info', next === 'light' ? 'fa-sun' : 'fa-moon');
  });

  /* =========================================================
     TRAILER MODAL
  ========================================================= */
  function pauseMusic() {
    if (!audio.paused || isPlaying) audio.pause();
    isPlaying = false;
    updatePlayIcons();
    npToggle.innerHTML = '<i class="fas fa-play"></i>';
  }

  function openTrailer(videoId, title) {
    if (!videoId) return;
    pauseMusic();
    videoWrapper.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/' + videoId +
      '?autoplay=1&rel=0&modestbranding=1';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    videoWrapper.appendChild(iframe);

    modalTitle.innerHTML = '<i class="fas fa-film"></i> ' + (title || 'Official Trailer');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeTrailer() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    videoWrapper.innerHTML = '';
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeTrailer);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeTrailer(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal.classList.contains('active')) closeTrailer();
      else if (searchOverlay.classList.contains('active')) closeSearchFn();
    }
  });

  document.getElementById('watchTrailerBtn').addEventListener('click', () => {
    openTrailer(DUNE_TRAILER, 'Dune: Part Two — Official Trailer');
  });

  /* =========================================================
     MUSIC PLAYER
  ========================================================= */
  function getVisibleSongs() {
    return getSongItems().filter(item => item.style.display !== 'none');
  }

  function formatTime(sec) {
    if (!isFinite(sec) || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return m + ':' + s;
  }

  function updatePlayIcons() {
    const items = getSongItems();
    items.forEach((item, i) => {
      const btn = item.querySelector('.play-btn');
      const active = (i === currentIndex && isPlaying);
      if (btn) btn.innerHTML = active
        ? '<i class="fas fa-pause"></i>'
        : '<i class="fas fa-play"></i>';
      item.classList.toggle('playing', active);
    });
  }

  function trackRecentlyPlayed(id) {
    state.recentSongs = [id, ...state.recentSongs.filter(x => x !== id)].slice(0, 12);
    store.set(KEYS.recentSongs, state.recentSongs);
  }

  function loadSong(index, autoplay = true) {
    const items = getSongItems();
    if (index < 0 || index >= items.length) return;
    const item = items[index];
    const src = item.dataset.audio;
    if (!src) {
      toast('Audio file not available for this track', 'error', 'fa-circle-exclamation');
      return;
    }

    if (modal.classList.contains('active')) closeTrailer();

    currentIndex = index;
    audio.src = src;
    audio.load();

    const title = item.dataset.song || 'Unknown';
    const artist = item.dataset.artist || '—';
    const cover = item.dataset.cover || 'cover-1';
    const durationText = item.querySelector('.duration')?.textContent || '0:00';

    npTitle.textContent = title;
    npArtist.textContent = artist;
    npCover.className = 'np-cover ' + cover;
    const coverIcon = item.querySelector('.song-cover');
    if (coverIcon) npCover.innerHTML = coverIcon.innerHTML;
    npDuration.textContent = durationText;
    npCurrent.textContent = '0:00';
    progressFill.style.width = '0%';

    nowBar.classList.add('active');
    trackRecentlyPlayed(item.dataset.id);

    if (autoplay) playAudio();
    else updatePlayIcons();
  }

  function playAudio() {
    if (modal.classList.contains('active')) closeTrailer();
    const promise = audio.play();
    if (promise !== undefined) {
      promise.then(() => {
        isPlaying = true;
        updatePlayIcons();
        npToggle.innerHTML = '<i class="fas fa-pause"></i>';
      }).catch(err => {
        console.warn('Audio play failed:', err);
        isPlaying = false;
        updatePlayIcons();
        npToggle.innerHTML = '<i class="fas fa-play"></i>';
        toast('Unable to play this audio file', 'error', 'fa-circle-exclamation');
      });
    } else {
      isPlaying = true;
      updatePlayIcons();
      npToggle.innerHTML = '<i class="fas fa-pause"></i>';
    }
  }

  function togglePlay() {
    if (currentIndex === -1) {
      const visible = getVisibleSongs();
      if (visible.length > 0) {
        const all = getSongItems();
        loadSong(all.indexOf(visible[0]), true);
      } else {
        toast('No songs available to play', 'error', 'fa-circle-exclamation');
      }
      return;
    }
    if (isPlaying) pauseMusic();
    else playAudio();
  }

  function playNext() {
    const all = getSongItems();
    const visible = getVisibleSongs();
    if (visible.length === 0) return;
    let pos = visible.findIndex(item => all.indexOf(item) === currentIndex);
    if (pos === -1) pos = -1;
    const next = visible[(pos + 1) % visible.length];
    loadSong(all.indexOf(next), true);
  }

  function playPrev() {
    const all = getSongItems();
    const visible = getVisibleSongs();
    if (visible.length === 0) return;
    let pos = visible.findIndex(item => all.indexOf(item) === currentIndex);
    if (pos === -1) pos = 0;
    const prev = visible[(pos - 1 + visible.length) % visible.length];
    loadSong(all.indexOf(prev), true);
  }

  /* Audio events */
  audio.addEventListener('timeupdate', () => {
    if (audio.duration && isFinite(audio.duration)) {
      const pct = (audio.currentTime / audio.duration) * 100;
      progressFill.style.width = pct + '%';
      npCurrent.textContent = formatTime(audio.currentTime);
      npDuration.textContent = formatTime(audio.duration);
    }
  });
  audio.addEventListener('loadedmetadata', () => {
    npDuration.textContent = formatTime(audio.duration);
    const items = getSongItems();
    if (currentIndex >= 0 && items[currentIndex]) {
      const d = items[currentIndex].querySelector('.duration');
      if (d) d.textContent = formatTime(audio.duration);
    }
  });
  audio.addEventListener('ended', playNext);
  audio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayIcons();
    npToggle.innerHTML = '<i class="fas fa-pause"></i>';
  });
  audio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayIcons();
    npToggle.innerHTML = '<i class="fas fa-play"></i>';
  });
  audio.addEventListener('error', () => {
    console.warn('Audio error for:', audio.src);
    isPlaying = false;
    updatePlayIcons();
  });

  /* Now Playing bar controls */
  npToggle.addEventListener('click', togglePlay);
  npNext.addEventListener('click', playNext);
  npPrev.addEventListener('click', playPrev);
  npClose.addEventListener('click', () => {
    pauseMusic();
    audio.src = '';
    currentIndex = -1;
    nowBar.classList.remove('active');
    updatePlayIcons();
  });

  /* Progress seeking */
  progressTrack.addEventListener('click', (e) => {
    if (!audio.duration || !isFinite(audio.duration)) return;
    const rect = progressTrack.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * audio.duration;
  });

  /* Volume */
  const savedVolume = store.get(KEYS.volume, 1);
  audio.volume = Math.min(Math.max(savedVolume, 0), 1);
  npVolume.value = audio.volume;

  npVolume.addEventListener('input', () => {
    audio.volume = parseFloat(npVolume.value);
    audio.muted = false;
    store.set(KEYS.volume, audio.volume);
    updateVolumeIcon();
  });
  npMute.addEventListener('click', () => {
    audio.muted = !audio.muted;
    updateVolumeIcon();
  });
  function updateVolumeIcon() {
    let icon = 'fa-volume-high';
    if (audio.muted || audio.volume === 0) icon = 'fa-volume-xmark';
    else if (audio.volume < 0.5) icon = 'fa-volume-low';
    npMute.innerHTML = '<i class="fas ' + icon + '"></i>';
  }
  updateVolumeIcon();

  /* =========================================================
     GLOBAL CLICK DELEGATION
  ========================================================= */
  document.addEventListener('click', (e) => {

    /* --- Like buttons (movies + songs + hero) --- */
    const likeBtn = e.target.closest('.like-btn');
    if (likeBtn) {
      e.preventDefault();
      e.stopPropagation();
      toggleFavourite(likeBtn.dataset.id, likeBtn.dataset.type, likeBtn.dataset.title);
      return;
    }

    /* --- Watch later --- */
    const wlBtn = e.target.closest('.watch-later-btn');
    if (wlBtn) {
      e.preventDefault();
      e.stopPropagation();
      toggleWatchLater(wlBtn.dataset.id, wlBtn.dataset.title);
      return;
    }

    /* --- Playlist --- */
    const plBtn = e.target.closest('.playlist-btn');
    if (plBtn) {
      e.preventDefault();
      e.stopPropagation();
      togglePlaylist(plBtn.dataset.id);
      return;
    }

    /* --- Play button inside song item --- */
    const playBtn = e.target.closest('.play-btn');
    if (playBtn) {
      e.preventDefault();
      e.stopPropagation();
      const item = playBtn.closest('.song-item');
      if (!item || !songList.contains(item)) return;
      const all = getSongItems();
      const idx = all.indexOf(item);
      if (idx === -1) return;
      if (currentIndex === idx) togglePlay();
      else loadSong(idx, true);
      return;
    }

    /* --- Song item click --- */
    const songItem = e.target.closest('.song-item');
    if (songItem && songList.contains(songItem)) {
      const all = getSongItems();
      const idx = all.indexOf(songItem);
      if (idx === -1) return;
      if (currentIndex === idx) togglePlay();
      else loadSong(idx, true);
      return;
    }

    /* --- Movie card click (open trailer) --- */
    const movieCard = e.target.closest('.movie-card');
    if (movieCard && movieCard.dataset.trailer) {
      openTrailer(movieCard.dataset.trailer, (movieCard.dataset.title || 'Movie') + ' — Trailer');
      trackRecentlyViewed(movieCard.dataset.id);
      return;
    }

    /* --- Search result click --- */
    const sr = e.target.closest('.search-result');
    if (sr) {
      const type = sr.dataset.resultType;
      const id = sr.dataset.resultId;
      if (type === 'movie') {
        const card = document.querySelector('.movie-card[data-id="' + id + '"]');
        if (card) openTrailer(card.dataset.trailer, card.dataset.title + ' — Trailer');
      } else {
        const song = document.querySelector('#songList .song-item[data-id="' + id + '"]');
        if (song) {
          const all = getSongItems();
          const idx = all.indexOf(song);
          if (idx >= 0) loadSong(idx, true);
        }
      }
      closeSearchFn();
      return;
    }
  });

  /* =========================================================
     FAVOURITES
  ========================================================= */
  function toggleFavourite(id, type, title) {
    if (!id || !type) return;
    if (type === 'movie') {
      const idx = state.favMovies.indexOf(id);
      if (idx >= 0) {
        state.favMovies.splice(idx, 1);
        toast('Removed from favourites', 'info', 'fa-heart-crack');
      } else {
        state.favMovies.push(id);
        toast('Added to favourites' + (title ? ' · ' + title : ''), 'success', 'fa-heart');
      }
      store.set(KEYS.favMovies, state.favMovies);
      burstHeart(type, id);
    } else if (type === 'song') {
      const idx = state.favSongs.indexOf(id);
      if (idx >= 0) {
        state.favSongs.splice(idx, 1);
        toast('Removed from favourites', 'info', 'fa-heart-crack');
      } else {
        state.favSongs.push(id);
        toast('Added to favourites' + (title ? ' · ' + title : ''), 'success', 'fa-heart');
      }
      store.set(KEYS.favSongs, state.favSongs);
      burstHeart(type, id);
    }
    syncFavouriteUI();
    renderFavourites();
  }

  function toggleWatchLater(id, title) {
    if (!id) return;
    const idx = state.watchLater.indexOf(id);
    if (idx >= 0) {
      state.watchLater.splice(idx, 1);
      toast('Removed from Watch Later', 'info', 'fa-clock-rotate-left');
    } else {
      state.watchLater.push(id);
      toast('Added to Watch Later' + (title ? ' · ' + title : ''), 'success', 'fa-clock');
    }
    store.set(KEYS.watchLater, state.watchLater);
    syncFavouriteUI();
    renderFavourites();
  }

  function togglePlaylist(id) {
    if (!id) return;
    const idx = state.playlist.indexOf(id);
    if (idx >= 0) {
      state.playlist.splice(idx, 1);
      toast('Removed from playlist', 'info', 'fa-circle-minus');
    } else {
      state.playlist.push(id);
      toast('Added to playlist', 'success', 'fa-circle-plus');
    }
    store.set(KEYS.playlist, state.playlist);
    syncFavouriteUI();
    renderFavourites();
  }

  function burstHeart(type, id) {
    const sel = type === 'movie'
      ? '.like-btn[data-type="movie"][data-id="' + id + '"]'
      : '.like-btn[data-type="song"][data-id="' + id + '"]';
    document.querySelectorAll(sel).forEach(btn => {
      btn.classList.remove('burst');
      void btn.offsetWidth;
      btn.classList.add('burst');
      setTimeout(() => btn.classList.remove('burst'), 600);
    });
  }

  function syncFavouriteUI() {
    document.querySelectorAll('.like-btn').forEach(btn => {
      const id = btn.dataset.id;
      const type = btn.dataset.type;
      const active = type === 'movie'
        ? state.favMovies.includes(id)
        : state.favSongs.includes(id);
      btn.classList.toggle('active', active);
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = active ? 'fas fa-heart' : 'far fa-heart';
      }
    });

    document.querySelectorAll('.watch-later-btn').forEach(btn => {
      const active = state.watchLater.includes(btn.dataset.id);
      btn.classList.toggle('active', active);
      const icon = btn.querySelector('i');
      if (icon) icon.className = active ? 'fas fa-clock' : 'far fa-clock';
    });

    document.querySelectorAll('.playlist-btn').forEach(btn => {
      const active = state.playlist.includes(btn.dataset.id);
      btn.classList.toggle('active', active);
      const icon = btn.querySelector('i');
      if (icon) icon.className = active ? 'fas fa-check' : 'fas fa-plus';
    });

    const heroFav = document.getElementById('heroFavBtn');
    if (heroFav) {
      const active = state.favMovies.includes('Way9Dexny3w');
      heroFav.classList.toggle('active', active);
      const span = heroFav.querySelector('span');
      const icon = heroFav.querySelector('i');
      if (icon) icon.className = active ? 'fas fa-heart' : 'far fa-heart';
      if (span) span.textContent = active ? 'In Favourites' : 'Add to Favourites';
    }
  }

  /* =========================================================
     FAVOURITES SECTION RENDER
  ========================================================= */
  let activeFavTab = 'movies';

  function movieCardHTML(card) {
    const posterSrc = card.querySelector('img')?.src || '';
    const alt = card.querySelector('img')?.alt || '';
    const rating = card.querySelector('.rating-tag')?.innerHTML || '';
    const quality = card.querySelector('.quality-tag')?.innerHTML || '';
    const title = card.dataset.title || '';
    const genre = card.dataset.genre || '';
    const year = card.dataset.year || '';
    const id = card.dataset.id;
    const trailer = card.dataset.trailer;
    return `
      <div class="movie-card" data-trailer="${trailer}" data-title="${title}" data-id="${id}" data-genre="${genre}" data-year="${year}">
        <div class="movie-poster">
          <span class="rating-tag">${rating}</span>
          <span class="quality-tag">${quality}</span>
          <img src="${posterSrc}" alt="${alt}">
          <div class="play-icon"><i class="fas fa-play-circle"></i></div>
          <div class="card-actions">
            <button class="card-action like-btn active" data-id="${id}" data-type="movie" data-title="${title}" aria-label="Favourite"><i class="fas fa-heart"></i></button>
          </div>
        </div>
        <div class="movie-info">
          <h3>${title}</h3>
          <div class="meta-row"><span class="genre-small">${genre}</span><span>${year}</span></div>
        </div>
      </div>`;
  }

  function songItemHTML(item) {
    const id = item.dataset.id;
    const song = item.dataset.song;
    const artist = item.dataset.artist;
    const cover = item.dataset.cover;
    const genre = item.dataset.genre;
    const audio = item.dataset.audio;
    return `
      <div class="song-item" data-id="${id}" data-song="${song}" data-artist="${artist}" data-cover="${cover}" data-genre="${genre}" data-audio="${audio}">
        <div class="song-cover ${cover}"><i class="fas fa-music"></i></div>
        <div class="song-details">
          <h4>${song}</h4>
          <div class="artist">${artist}</div>
          <div class="album">From your favourites</div>
        </div>
        <div class="song-actions">
          <button class="song-like like-btn active" data-id="${id}" data-type="song" data-title="${song}" aria-label="Favourite"><i class="fas fa-heart"></i></button>
          <button class="song-playlist playlist-btn active" data-id="${id}" aria-label="Remove from playlist"><i class="fas fa-check"></i></button>
        </div>
      </div>`;
  }

  function renderFavourites() {
    const movies = state.favMovies
      .map(id => document.querySelector('.movie-card[data-id="' + id + '"]'))
      .filter(Boolean);
    const songs = state.favSongs
      .map(id => songList.querySelector('.song-item[data-id="' + id + '"]'))
      .filter(Boolean);
    const wl = state.watchLater
      .map(id => document.querySelector('.movie-card[data-id="' + id + '"]'))
      .filter(Boolean);
    const pl = state.playlist
      .map(id => songList.querySelector('.song-item[data-id="' + id + '"]'))
      .filter(Boolean);

    favMoviesEl.innerHTML = movies.map(movieCardHTML).join('');
    favSongsEl.innerHTML = songs.map(songItemHTML).join('');
    favWatchLaterEl.innerHTML = wl.map(movieCardHTML).join('');
    favPlaylistEl.innerHTML = pl.map(songItemHTML).join('');

    const total = movies.length + songs.length + wl.length + pl.length;
    favCountEl.textContent = total + ' item' + (total === 1 ? '' : 's');

    // Show/hide based on active tab
    applyFavTab(activeFavTab);
    // Empty state logic
    let currentEmpty = false;
    if (activeFavTab === 'movies' && movies.length === 0) currentEmpty = true;
    if (activeFavTab === 'songs' && songs.length === 0) currentEmpty = true;
    if (activeFavTab === 'watchlater' && wl.length === 0) currentEmpty = true;
    if (activeFavTab === 'playlist' && pl.length === 0) currentEmpty = true;
    favEmptyEl.style.display = currentEmpty ? '' : 'none';
  }

  function applyFavTab(tab) {
    activeFavTab = tab;
    favMoviesEl.style.display = tab === 'movies' ? '' : 'none';
    favSongsEl.style.display = tab === 'songs' ? '' : 'none';
    favWatchLaterEl.style.display = tab === 'watchlater' ? '' : 'none';
    favPlaylistEl.style.display = tab === 'playlist' ? '' : 'none';

    document.querySelectorAll('.fav-tabs .filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.favTab === tab);
    });
  }

  document.querySelectorAll('.fav-tabs .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      applyFavTab(chip.dataset.favTab);
      renderFavourites();
    });
  });

  /* =========================================================
     RECENTLY VIEWED MOVIES
  ========================================================= */
  function trackRecentlyViewed(id) {
    if (!id) return;
    state.recentMovies = [id, ...state.recentMovies.filter(x => x !== id)].slice(0, 12);
    store.set(KEYS.recentMovies, state.recentMovies);
  }

  /* =========================================================
     SONG FILTERS
  ========================================================= */
  document.querySelectorAll('#songGenreFilters .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#songGenreFilters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter;
      getSongItems().forEach(item => {
        const show = filter === 'all' || item.dataset.genre === filter;
        item.style.display = show ? '' : 'none';
      });
    });
  });

  /* =========================================================
     SONG SORT
  ========================================================= */
  document.getElementById('songSort').addEventListener('change', (e) => {
    const mode = e.target.value;
    const items = getSongItems();
    const sorted = [...items];
    if (mode === 'title-asc') sorted.sort((a, b) => (a.dataset.song || '').localeCompare(b.dataset.song || ''));
    if (mode === 'title-desc') sorted.sort((a, b) => (b.dataset.song || '').localeCompare(a.dataset.song || ''));
    if (mode === 'artist-asc') sorted.sort((a, b) => (a.dataset.artist || '').localeCompare(b.dataset.artist || ''));
    sorted.forEach((el, i) => {
      const idx = el.querySelector('.song-index');
      if (idx) idx.textContent = String(i + 1).padStart(2, '0');
      songList.appendChild(el);
    });
  });

  /* =========================================================
     MOVIE GENRE FILTER
  ========================================================= */
  document.querySelectorAll('#movieGenreFilters .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#movieGenreFilters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.movieGenre;
      document.querySelectorAll('.movie-row-section .movie-card').forEach(card => {
        const g = (card.dataset.genre || '').toLowerCase();
        const show = filter === 'all' || g === filter.toLowerCase();
        card.style.display = show ? '' : 'none';
      });
      // Hide sections with zero visible cards
      document.querySelectorAll('.movie-row-section').forEach(section => {
        const visible = Array.from(section.querySelectorAll('.movie-card')).filter(c => c.style.display !== 'none');
        section.style.display = visible.length === 0 ? 'none' : '';
      });
    });
  });

  /* =========================================================
     MOVIE SORT
  ========================================================= */
  document.getElementById('movieSort').addEventListener('change', (e) => {
    const mode = e.target.value;
    document.querySelectorAll('.movie-row-section .movie-grid, .movie-row-section .row-scroll').forEach(container => {
      const cards = Array.from(container.querySelectorAll('.movie-card'));
      if (cards.length === 0) return;
      let sorted = [...cards];
      if (mode === 'rating-desc') sorted.sort((a, b) => parseFloat(b.dataset.rating || 0) - parseFloat(a.dataset.rating || 0));
      if (mode === 'rating-asc') sorted.sort((a, b) => parseFloat(a.dataset.rating || 0) - parseFloat(b.dataset.rating || 0));
      if (mode === 'year-desc') sorted.sort((a, b) => parseInt(b.dataset.year || 0) - parseInt(a.dataset.year || 0));
      if (mode === 'year-asc') sorted.sort((a, b) => parseInt(a.dataset.year || 0) - parseInt(b.dataset.year || 0));
      if (mode === 'title-asc') sorted.sort((a, b) => (a.dataset.title || '').localeCompare(b.dataset.title || ''));
      if (mode === 'default') {
        // restore original DOM order (based on data-id ordering from markup)
        sorted = cards; // leave as-is
      }
      sorted.forEach(el => container.appendChild(el));
    });
  });

  /* =========================================================
     SEARCH
  ========================================================= */
  function openSearchFn() {
    searchOverlay.classList.add('active');
    searchOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => searchInput.focus(), 150);
  }
  function closeSearchFn() {
    searchOverlay.classList.remove('active');
    searchOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    searchInput.value = '';
    searchResults.innerHTML = '<div class="search-hint"><i class="fas fa-lightbulb"></i> Start typing to search movies, songs, artists, genres…</div>';
  }

  openSearchBtn.addEventListener('click', openSearchFn);
  closeSearchBtn.addEventListener('click', closeSearchFn);
  searchOverlay.addEventListener('click', (e) => { if (e.target === searchOverlay) closeSearchFn(); });

  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    runSearch('');
  });

  searchInput.addEventListener('input', () => runSearch(searchInput.value));

  function runSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      searchResults.innerHTML = '<div class="search-hint"><i class="fas fa-lightbulb"></i> Start typing to search movies, songs, artists, genres…</div>';
      return;
    }

    const movies = getMovieCards().map(card => ({
      id: card.dataset.id,
      title: card.dataset.title || '',
      genre: card.dataset.genre || '',
      year: card.dataset.year || '',
      img: card.querySelector('img')?.src || ''
    })).filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.genre.toLowerCase().includes(q) ||
      m.year.includes(q)
    );

    const songs = getSongItems().map(item => ({
      id: item.dataset.id,
      title: item.dataset.song || '',
      artist: item.dataset.artist || '',
      genre: item.dataset.genre || ''
    })).filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q)
    );

    if (movies.length === 0 && songs.length === 0) {
      searchResults.innerHTML = `
        <div class="search-empty">
          <i class="fas fa-magnifying-glass"></i>
          <h3>No results found</h3>
          <p>Try a different title, artist or genre.</p>
        </div>`;
      return;
    }

    let html = '';
    if (movies.length) {
      html += '<div class="search-section-label">Movies · ' + movies.length + '</div>';
      html += movies.map(m => `
        <div class="search-result" data-result-type="movie" data-result-id="${m.id}">
          <div class="search-result-thumb"><img src="${m.img}" alt=""></div>
          <div class="search-result-info">
            <h4>${m.title}</h4>
            <p>${m.genre} · ${m.year}</p>
          </div>
          <span class="search-type-badge movie">Movie</span>
        </div>`).join('');
    }
    if (songs.length) {
      html += '<div class="search-section-label">Songs · ' + songs.length + '</div>';
      html += songs.map(s => `
        <div class="search-result" data-result-type="song" data-result-id="${s.id}">
          <div class="search-result-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:var(--primary);background:linear-gradient(135deg,#7b2ff7,#f107a3);"><i class="fas fa-music"></i></div>
          <div class="search-result-info">
            <h4>${s.title}</h4>
            <p>${s.artist} · ${s.genre}</p>
          </div>
          <span class="search-type-badge song">Song</span>
        </div>`).join('');
    }
    searchResults.innerHTML = html;
  }

  /* =========================================================
     SURPRISE ME
  ========================================================= */
  surpriseBtn.addEventListener('click', () => {
    const movies = getMovieCards().filter(c => c.dataset.trailer);
    const songs = getSongItems();
    const pool = movies.concat(songs);
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick.classList.contains('movie-card')) {
      openTrailer(pick.dataset.trailer, pick.dataset.title + ' — Trailer');
      trackRecentlyViewed(pick.dataset.id);
      toast('Surprise! Playing trailer for ' + pick.dataset.title, 'info', 'fa-dice');
    } else {
      const all = getSongItems();
      const idx = all.indexOf(pick);
      if (idx >= 0) {
        loadSong(idx, true);
        toast('Surprise! Now playing ' + pick.dataset.song, 'info', 'fa-dice');
      }
    }
  });

  /* =========================================================
     SMOOTH SCROLL
  ========================================================= */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* =========================================================
     BACK TO TOP
  ========================================================= */
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* =========================================================
     INITIAL SYNC
  ========================================================= */
  syncFavouriteUI();
  renderFavourites();

})();