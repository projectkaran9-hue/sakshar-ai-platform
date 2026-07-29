// YouTube video links curated per lesson (Hindi/English literacy content)
export const LESSON_YOUTUBE = {
  l1_vowels:        "https://youtu.be/RUSCz41aDug?si=dWyrI5DOWSZvvFD7&t=1",
  l1_consonants:    "https://www.youtube.com/embed/VdbQR8mAmcc?autoplay=1&mute=1",
  l1_phonetics:     "https://www.youtube.com/watch?v=xJSVrq-6-jc",
  l1_sightwords:    "https://www.youtube.com/watch?v=YkXoHh72xrg",
  l1_strokes:       "https://www.youtube.com/watch?v=Q_1iZgQbDl4",
  l1_capsmall:      "https://www.youtube.com/watch?v=evVx1_h764g",
  l1_numbers:       "https://www.youtube.com/watch?v=FvXRAnUhpGQ",
  l1_colors:        "https://www.youtube.com/watch?v=0wJHPJGBhTU",
  l1_shapes:        "https://www.youtube.com/watch?v=SOBCQ7pJjiA",
  l1_daysmonths:    "https://www.youtube.com/watch?v=10yhyUT2lgA",
  l1_weather:       "https://www.youtube.com/watch?v=he4nzgFjPk8",
  l1_family:        "https://www.youtube.com/watch?v=24GWC1dDyUM",
  l1_bodyparts:     "https://www.youtube.com/watch?v=G-7AMnZLOCM",
  l1_animals:       "https://www.youtube.com/watch?v=kwGklumycWc",
  l1_fruits:        "https://www.youtube.com/watch?v=rTYftexzl7c",
  l1_vegetables:    "https://www.youtube.com/watch?v=LiWmzpDoHQ8",
  l1_vehicles:      "https://www.youtube.com/watch?v=W6QrQkj8xAo",
  l1_greetings:     "https://www.youtube.com/watch?v=ZbSZCBYKfHk",
  l1_opposites:     "https://www.youtube.com/watch?v=ABrZ3IRoUBE",
  l1_questionwords: "https://www.youtube.com/watch?v=mRLo96ix9pA",
  l1_rhyming:       "https://www.youtube.com/watch?v=4PW3_LErVZk",
  l1_emotions:      "https://www.youtube.com/watch?v=MeNY-RxDJig",
  l1_household:     "https://www.youtube.com/watch?v=2U5KDmPtLeY",
  l1_classroom:     "https://www.youtube.com/watch?v=UJwkR6g0H7k",
  l1_safety:        "https://www.youtube.com/watch?v=Evb9K6U37E4",
  l2_spelling:      "https://www.youtube.com/watch?v=9T-O4EzWhrg",
  l2_vocab:         "https://www.youtube.com/watch?v=DUagMRtVdA4",
  l2_reading:       "https://www.youtube.com/watch?v=ua2f9-xxgG0",
  l2_pronounce:     "https://www.youtube.com/watch?v=kpC2FdTmjwc",
  l2_grammar:       "https://www.youtube.com/watch?v=IaTw1ol2QJM",
  l3_grammar:       "https://www.youtube.com/watch?v=a4SyiKqb-YA",
  l3_reading:       "https://www.youtube.com/watch?v=xmO6dS1K2Zc",
  l3_writing:       "https://www.youtube.com/watch?v=NM6CFQQY9SA",
  l3_comm:          "https://www.youtube.com/watch?v=lvFd80UnUrk",
  l3_functional:    "https://www.youtube.com/watch?v=WogJHVXW5Zs",
  l4_comprehension: "https://www.youtube.com/watch?v=E82FnJa2Vfo",
  l4_sentences:     "https://www.youtube.com/watch?v=A5_g-iUMbT4",
  l4_digital:       "https://www.youtube.com/watch?v=vKauB_ui598",
  l4_speech:        "https://www.youtube.com/watch?v=by1QAoRcc-U",
  l4_critical:      "https://www.youtube.com/watch?v=DCln1DF0_vo",
};

/**
 * Converts any supported YouTube URL shape (watch?v=, youtu.be/, /embed/)
 * into a privacy-enhanced embeddable URL. Returns null when no URL is given.
 */
export function getYouTubeEmbedUrl(watchUrl) {
  if (!watchUrl) return null;
  let videoId = null;

  if (watchUrl.includes('v=')) {
    videoId = watchUrl.split('v=')[1].split('&')[0];
  } else if (watchUrl.includes('youtu.be/')) {
    videoId = watchUrl.split('youtu.be/')[1].split('?')[0];
  } else if (watchUrl.includes('/embed/')) {
    videoId = watchUrl.split('/embed/')[1].split('?')[0];
  } else {
    videoId = watchUrl.split('/').pop();
  }

  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
}