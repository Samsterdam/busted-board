/** Taste-quiz constants. Dependency-free. */

import { RATING_MAX, RATING_MIN } from "./ratings";

/** A quiz "like" is recorded as a top-of-scale rating, "dislike" as the floor. */
export const QUIZ_LIKE_RATING = RATING_MAX;
export const QUIZ_DISLIKE_RATING = RATING_MIN;

/** How many recognizable titles to present in one quiz pass. */
export const QUIZ_SIZE = 15;
