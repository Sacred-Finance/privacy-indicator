import {
    bin,
    thresholdFreedmanDiaconis,
    min,
    max,
} from 'https://cdn.skypack.dev/d3-array@3';
// https://observablehq.com/@d3/d3-bin

const barMultipler = 2; //increase number get a higher resolution on the histogram (more bars)
const maxBars = 2000; //maximum number of bars to categorie data into

/**
 * Bucket individual mixer times into 'histogram bars'
 * @param {[number]} days Array of time in days that users have spent in the mixer for the last month
 * @returns
 */
function getHistogram(days) {
    days.sort((a, b) => a - b);
    days = days.map((day) => Math.round(day));

    let bars = //how many bars the histogram will have
        thresholdFreedmanDiaconis(days, min(days), max(days)) * barMultipler;

    if (bars > maxBars) bars = maxBars; //the algorithm can sometimes return infinite bars

    const histogram = bin()
        .thresholds(bars)(days) //generate the histogram
        .filter((data) => data.length) //remove bars with no data
        //.map((bar) => bar.filter(() => true)) //remove meta data elements (x0, x1)
        .sort((a, b) => a.length - b.length); // sort so bars with fewest elements come first
    return histogram;
}

/**
 * Score the histogram based on size of anonymity set and popularity of that set
 * @param {[[integer]]} histogram
 */
function scoreHistogram(histogram) {
    // Overly popular anonymity sets are discouraged since that is where a snooper would first try to find you
    // Small sets are discouraged because there is less 'cover' without many users
    // Middle sized sets are encouraged since they are large enough but less popular
    const largestSet = histogram
        .map((bar) => bar.length) //get length of each bar
        .sort((a, b) => a - b) //sort highest to lowest
        .reverse()[0]; //get size of highest one

    const scores = histogram
        .map((bar) => Math.round((bar.length / largestSet) * 100)) // normalize to 100
        .map((length) => (-Math.pow(length, 2) + 100 * length) / 25); // score the values.

    return histogram.map((bar, i) => {
        bar['score'] = scores[i]; //add scores to the histogram
        return bar;
    });
}

/**
 * Given a histogram, recommend a range of days that are safe to deposit
 * @param {[[integer]]} histogram
 */
function getBestRange(histogram) {
    let bestRange = [0, 0];
    bestRange['score'] = 0;

    histogram.forEach((bar) => {
        if (bar['score'] > bestRange['score']) {
            bestRange = [bar['x0'], bar['x1']];
            bestRange['score'] = bar['score'];
        }
    });

    return bestRange;
}

/**
 * Return a privacy score given a specific day
 * @param {integer} day
 * @param {[[integer]]} histogram
 */
function getScore(day, histogram) {
    let score = 0; //if the day isn't in the histogram, then it has zero size anonymity set
    histogram.forEach((bar) => {
        if (day >= bar['x0'] && day <= bar['x1']) score = bar.score;
    });

    return score;
}

//this is the number of days each user has spent in the mixer in the last month. This is a full deposit/ withdraw cycle
const days = [
    1, 1, 1.5, 3, 8, 8.2, 8.3, 15, 15, 15, 15, 20, 40, 40, 40, 40, 40, 40, 40,
    42, 42, 42, 45, 45, 45, 46, 46, 72, 72, 72, 80, 100, 400, 405,
];

const histogram = getHistogram(days); // the days are clustered to a histogram with different buckets. E.g. 1-10 days, 11-20 days, etc
const scoredHistogram = scoreHistogram(histogram); //a score is added to the histogram based on the size of the set and its popularity
const score = getScore(20, scoredHistogram); //this will give the score for day 20
const bestRange = getBestRange(scoredHistogram); // this will tell the user the best range to keep tokens in the mixer

console.log(scoredHistogram, score, bestRange);
