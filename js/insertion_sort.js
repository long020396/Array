var HIGHLIGHT_NONE = "lightblue";
var HIGHLIGHT_STANDARD = "green";
var HIGHLIGHT_SPECIAL = "#DC143C";
var HIGHLIGHT_SORTED = "orange";

var HIGHLIGHT_LEFT = "#3CB371";
var HIGHLIGHT_RIGHT = "#9932CC";
var HIGHLIGHT_PIVOT = "yellow";

var HIGHLIGHT_GRAY = "#CCCCCC";

var barWidth = 50;
var maxHeight = 230;
var gapBetweenBars = 5;
var maxNumOfElements = 20; 					// max 20 elements currently
var gapBetweenPrimaryAndSecondaryRows = 30; // of the bars
var maxElementValue = 50;
var statusCodetraceWidth = 420;
var actionsWidth = 150;

// Green, Pink, Blue, Red, Yellow, Indigo, Orange, Lime
var colourArray = ["#52bc69", "#d65775", "#2ebbd1", "#d9513c", "#fec515", "#4b65ba", "#ff8a27", "#a7d41e"];

function getColours() {
    var generatedColours = new Array();
    while (generatedColours.length < 4) {
        var n = (Math.floor(Math.random() * colourArray.length));
        if ($.inArray(n, generatedColours) == -1)
            generatedColours.push(n);
    }
    return generatedColours;
}

var generatedColours = getColours();
var surpriseColour = colourArray[generatedColours[0]];
var colourTheSecond = colourArray[generatedColours[1]];
var colourTheThird = colourArray[generatedColours[2]];
var colourTheFourth = colourArray[generatedColours[3]];

var sortType;

var transitionTime = 350;
var issPlaying;
var animInterval;
var currentStep;
var centreBarsOffset;
var computeInversionIndex = false;

var statelist = new Array();

var scaler = d3.scale
    .linear()
    .range([0, maxHeight]);

var canvas = d3.select('#viz-canvas')
    .attr('height', maxHeight * 2 + gapBetweenPrimaryAndSecondaryRows)
    .attr('width', barWidth * maxNumOfElements);

var POSITION_USE_PRIMARY = "a";
var POSITION_USE_SECONDARY_IN_DEFAULT_POSITION = "b";

// Object definition

var Entry = function (value, highlight, position, secondaryPositionStatus) {
    this.value = value; // number
    this.highlight = highlight; // string, use HIGHLIGHT_ constants
    this.position = position; // number
    this.secondaryPositionStatus = secondaryPositionStatus; // integer, +ve for position overwrite, -ve for absolute postion (-1 for 0th absolution position)
}

var Backlink = function (value, highlight, entryPosition, secondaryPositionStatus) {
    this.value = value; // number
    this.highlight = highlight; // string, use HIGHLIGHT_ constants
    this.entryPosition = entryPosition; // number
    this.secondaryPositionStatus = secondaryPositionStatus; // integer, +ve for position overwrite
}

var State = function (entries, backlinks, barsCountOffset, status, lineNo) {
    this.entries = entries; // array of Entry's
    this.backlinks = backlinks; // array of Backlink's
    this.barsCountOffset = barsCountOffset; // how many bars to "disregard" (+ve) or to "imagine" (-ve) w.r.t. state.entries.length when calculating the centre position
    this.status = status;
    this.lineNo = lineNo; //integer or array, line of the code to highlight
}

// Helpers

var EntryBacklinkHelper = new Object();
EntryBacklinkHelper.appendList = function (entries, backlinks, numArray) {
    for (var i = 0; i < numArray.length; i++) {
        EntryBacklinkHelper.append(entries, backlinks, numArray[i]);
    }
}

EntryBacklinkHelper.append = function (entries, backlinks, newNumber) {
    entries.push(new Entry(newNumber, HIGHLIGHT_NONE, entries.length, POSITION_USE_PRIMARY));
    backlinks.push(new Backlink(newNumber, HIGHLIGHT_NONE, backlinks.length, POSITION_USE_PRIMARY));
}

EntryBacklinkHelper.update = function (entries, backlinks) {
    for (var i = 0; i < backlinks.length; i++) {
        entries[backlinks[i].entryPosition].highlight = backlinks[i].highlight;
        entries[backlinks[i].entryPosition].position = i;
        entries[backlinks[i].entryPosition].secondaryPositionStatus = backlinks[i].secondaryPositionStatus;
    }
}

EntryBacklinkHelper.copyEntry = function (oldEntry) {
    return new Entry(oldEntry.value, oldEntry.highlight, oldEntry.position, oldEntry.secondaryPositionStatus);
}

EntryBacklinkHelper.copyBacklink = function (oldBacklink) {
    return new Backlink(oldBacklink.value, oldBacklink.highlight, oldBacklink.entryPosition, oldBacklink.secondaryPositionStatus);
}

EntryBacklinkHelper.swapBacklinks = function (backlinks, i, j) {
    var tmp = backlinks[i];
    backlinks[i] = backlinks[j];
    backlinks[j] = tmp;
}

// class StateHelper
var StateHelper = new Object();

StateHelper.createNewState = function (numArray) {
    var entries = new Array();
    var backlinks = new Array();
    EntryBacklinkHelper.appendList(entries, backlinks, numArray);
    return new State(entries, backlinks, 0, "", 0);
}

StateHelper.copyState = function (oldState) {
    var newEntries = new Array();
    var newBacklinks = new Array();
    for (var i = 0; i < oldState.backlinks.length; i++) {
        newEntries.push(EntryBacklinkHelper.copyEntry(oldState.entries[i]));
        newBacklinks.push(EntryBacklinkHelper.copyBacklink(oldState.backlinks[i]));
    }

    var newLineNo = oldState.lineNo;
    if (newLineNo instanceof Array) {
        newLineNo = oldState.lineNo.slice();
    }

    return new State(newEntries, newBacklinks, oldState.barsCountOffset, oldState.status, newLineNo);
}

StateHelper.updateCopyPush = function (list, stateToPush) {
    EntryBacklinkHelper.update(stateToPush.entries, stateToPush.backlinks);
    list.push(StateHelper.copyState(stateToPush));
}

// class FunctionList

var FunctionList = new Object();
FunctionList.text_y = function (d) {
    var barHeight = scaler(d.value);
    if (barHeight < 32) {
        return -15;
    }
    return barHeight - 15;
}

FunctionList.g_transform = function (d) {
    if (d.secondaryPositionStatus == POSITION_USE_PRIMARY)
        return 'translate(' + (centreBarsOffset + d.position * barWidth) + ", " + (maxHeight - scaler(d.value)) + ')';
    else if (d.secondaryPositionStatus == POSITION_USE_SECONDARY_IN_DEFAULT_POSITION)
        return 'translate(' + (centreBarsOffset + d.position * barWidth) + ", " + (maxHeight * 2 + gapBetweenPrimaryAndSecondaryRows - scaler(d.value)) + ')';
    else if (d.secondaryPositionStatus >= 0)
        return 'translate(' + (centreBarsOffset + d.secondaryPositionStatus * barWidth) + ", " + (maxHeight * 2 + gapBetweenPrimaryAndSecondaryRows - scaler(d.value)) + ')';
    else if (d.secondaryPositionStatus < 0)
        return 'translate(' + ((d.secondaryPositionStatus * -1 - 1) * barWidth) + ", " + (maxHeight * 2 + gapBetweenPrimaryAndSecondaryRows - scaler(d.value)) + ')';
    else
        return 'translation(0, 0)'; // error
}

var generateRandomNumber = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

var generateRandomNumberArray = function (size, limit) {
    var numArray = new Array();
    for (var i = 0; i < size; i++) {
        numArray.push(generateRandomNumber(1, limit));
    }
    return numArray;
}

var populatePseudoCode = function (code) {
    var i = 1;
    for (; i <= 7 && i <= code.length; i++) {
        $("#code" + i).html(
            code[i - 1].replace(
                /^\s+/,
                function (m) {
                    return m.replace(/\s/g, "&nbsp;");
                }
            )
        );
    }
    for (; i <= 7; i++) {
        $("#code" + i).html("");
    }
}

$(function () {
    initUI();
    createList('random');
});

$('li').click(function () {
    var str = $(this).text();
    $('.title').html(str);
});

$('#create-random').click(function () {
    createList('random');
});

$('#create-userdefined-go').click(function () {
    createList('userdefined');
});

$('#create').click(function () {
    showCreateActionsPanel();
});

$('#sort').click(function () {
    hideActionsPanel();
    showStatusPanel();
    showCodetracePanel();
    $('#timeline').show();

   var str = $('.title').text();
   if (str === 'Insertion sort') {
       insertionSort();
   } else if (str === 'Cocktail Shaker sort') {
       cocktailShakerSort();
   } else if (str === 'Shell sort') {
       shellSort();
   } else if (str === 'Merge sort') {
       mergeSort();
   }
});

var drawState = function (stateIndex) {
    drawBars(statelist[stateIndex]);
    $('#status p').html(statelist[stateIndex].status);
    // $('#log').html(statelist[stateIndex].logMessage);
    highlightLine(statelist[stateIndex].lineNo);
}

var drawBars = function (state) {
    scaler.domain([0, d3.max(state.entries, function (d) {
        return d.value;
    })]);

    centreBarsOffset = (maxNumOfElements - (state.entries.length - state.barsCountOffset)) * barWidth / 2;

    var canvasData = canvas.selectAll('g').data(state.entries);

    // Exit ==============================
    var exitData = canvasData.exit()
        .remove();

    // Entry ==============================
    var newData = canvasData.enter()
        .append("g")
        .attr("transform", FunctionList.g_transform);

    newData.append("rect")
        .attr("height", 0)
        .attr("width", 0);

    newData.append("text")
        .attr("dy", ".35em")
        .attr("x", ((barWidth - gapBetweenBars) / 2) - 6.5)
        .attr("y", FunctionList.text_y)
        .text(function (d) {
            return d.value;
        });

    // Update ==============================
    canvasData.select("text")
        .transition()
        .attr("y", FunctionList.text_y)
        .text(function (d) {
            return d.value;
        });

    canvasData.select("rect")
        .transition()
        .attr("height", function (d) {
            return scaler(d.value);
        })
        .attr("width", barWidth - gapBetweenBars)
        .style("fill", function (d) {
            return d.highlight;
        });

    canvasData.transition()
        .attr("transform", FunctionList.g_transform)
};

this.convertToNumber = function (num) {
    return +num;
}

this.loadNumberList = function (numArray) {
    issPlaying = false;
    currentStep = 0;

    statelist = [StateHelper.createNewState(numArray)];
    drawState(0);
}

this.createList = function (type) {
    var numArrayMaxListSize = 20;
    var numArrayMaxElementValue = maxElementValue;

    var numArray = generateRandomNumberArray(generateRandomNumber(10, numArrayMaxListSize), numArrayMaxElementValue);

    switch (type) {
        case 'random':
            break;
        case 'userdefined':
            numArray = $('#userdefined-input').val().split(",");

            if (numArray.length > maxNumOfElements) {
                $("#create-err").html('You can&#39;t have more than {maxSize} elements!'.replace("{maxSize}", numArrayMaxListSize));
                return false;
            }

            for (var i = 0; i < numArray.length; i++) {
                var tmp = convertToNumber(numArray[i]);

                if (numArray[i].trim() == "") {
                    $('#create-err').html('Missing an element (duplicate comma)');
                    return false;
                }
                if (isNaN(tmp)) {
                    $('#create-err').html('There&#39;s an invalid element (not number): {num}'.replace('{num}', numArray[i]));
                    return false;
                }
                if (tmp < 1 || tmp > numArrayMaxElementValue) {
                    $("#create-err").html('Element must be in range from 1 to {maxValue}. (Out of range number: {num}.)'.replace("{maxValue}", numArrayMaxElementValue).replace("{num}", numArray[i]));
                    return false;
                }

                numArray[i] = convertToNumber(numArray[i]);
            }

            $('#create-err').html('');
    }

    this.loadNumberList(numArray);
}

function highlightLine(lineNumbers) {
    $('#codetrace p').css('background-color', '#66BB6A').css('color', 'white');
    if (lineNumbers instanceof Array) {
        for (var i = 0; i < lineNumbers.length; i++)
            if (lineNumbers[i] != 0)
                $('#code' + lineNumbers[i]).css('background-color', 'black').css('color', 'white');
    }
    else
        $('#code' + lineNumbers).css('background-color', 'black').css('color', 'white');
}

var drawCurrentState = function () {
    drawState(currentStep);
    if (currentStep == (statelist.length - 1)) {
        pause();
        $('#play img').attr('src', 'https://visualgo.net/img/replay.png').attr('alt', 'replay').attr('title', 'replay');
    }
    else
        $('#play img').attr('src', 'https://visualgo.net/img/play.png').attr('alt', 'play').attr('title', 'play');
}

this.insertionSort = function (callback) {
    var numElements = statelist[0].backlinks.length;
    var state = StateHelper.copyState(statelist[0]);

    populatePseudoCode([
        'mark first element as sorted',
        '  for each unsorted element X',
        '    extract the element X',
        '    for j = lastSortedIndex down to 0',
        '      if current element j > X',
        '        move sorted element to the right by 1',
        '      break loop and insert X here'
    ]);

    // Mark first element is sorted
    state.status = "Mark the first element ({first}) as sorted".replace('{first}', state.backlinks[0].value);
    state.backlinks[0].highlight = HIGHLIGHT_SORTED;
    state.lineNo = 1;
    StateHelper.updateCopyPush(statelist, state);

    // Start loop forward
    for (var i = 1; i < numElements; i++) {
        state.backlinks[i].highlight = HIGHLIGHT_SPECIAL;
        state.lineNo = [2, 3];
        state.status = "Extract the first unsorted element ({val})".replace('{val}', state.backlinks[i].value);
        StateHelper.updateCopyPush(statelist, state);
        state.backlinks[i].secondaryPositionStatus = POSITION_USE_SECONDARY_IN_DEFAULT_POSITION;

        // Start loop backward from i index
        for (var j = (i - 1); j >= 0; j--) {
            state.backlinks[j].highlight = HIGHLIGHT_STANDARD;
            state.lineNo = 4;
            state.status = "Figure where to insert extracted element; comparing with sorted element {val}.".replace('{val}', state.backlinks[j].value);
            StateHelper.updateCopyPush(statelist, state);
            if (state.backlinks[j].value > state.backlinks[j + 1].value) {
                // Swap
                state.backlinks[j].highlight = HIGHLIGHT_SORTED;
                state.lineNo = [5, 6];
                state.status = "<div>{val1} > {val2} is true, hence move current sorted element ({val1}) to the right</div><div> by 1.</div>".replace('{val1}', state.backlinks[j].value).replace('{val2}', state.backlinks[j + 1].value);
                EntryBacklinkHelper.swapBacklinks(state.backlinks, j, j + 1);

                if (j > 0) {
                    state.backlinks[j - 1].highlight = HIGHLIGHT_STANDARD;
                    StateHelper.updateCopyPush(statelist, state);
                }
            } else {
                state.backlinks[j].highlight = HIGHLIGHT_SORTED;
                state.backlinks[j + 1].highlight = HIGHLIGHT_SORTED;
                state.lineNo = 7;
                state.status = "{val1} > {val2} is false, insert element at current position.".replace('{val1}', state.backlinks[j].value).replace('{val2}', state.backlinks[j + 1].value);
                state.backlinks[j + 1].secondaryPositionStatus = POSITION_USE_PRIMARY;
                StateHelper.updateCopyPush(statelist, state);
                break;
            }

            if (j == 0) {
                StateHelper.updateCopyPush(statelist, state);

                state.backlinks[j].secondaryPositionStatus = POSITION_USE_PRIMARY;
                // StateHelper.updateCopyPush(statelist, state);
                state.backlinks[j].highlight = HIGHLIGHT_SORTED;
                StateHelper.updateCopyPush(statelist, state);

            }
        } // End backward loop
    } // End forward loop

    state.lineNo = 0;
    state.status = "List sorted!";
    StateHelper.updateCopyPush(statelist, state);

    this.play(callback);
    return true;
}

this.cocktailShakerSort = function (callback) {
    var numElements = statelist[0].backlinks.length;
    var state = StateHelper.copyState(statelist[0]);

    var swapped = true;
    var start = 0;
    var end = numElements;

    // Start while loop
    while (swapped) {
        // Reset the swapped flag to enter the loop
        swapped = false;

        // Start loop forward, sort like bubble sort
        for (var i = start; i < end - 1; i++) {
            state.backlinks[i].highlight = HIGHLIGHT_STANDARD;
            StateHelper.updateCopyPush(statelist, state);

            if (i + 1 <= end) {
                state.backlinks[i + 1].highlight = HIGHLIGHT_SPECIAL;
                StateHelper.updateCopyPush(statelist, state);
            }

            if (state.backlinks[i].value > state.backlinks[i + 1].value) {
                EntryBacklinkHelper.swapBacklinks(state.backlinks, i, i + 1);
                StateHelper.updateCopyPush(statelist, state);

                state.backlinks[i].highlight = HIGHLIGHT_NONE;
                if (i === end - 2) {
                    state.backlinks[end - 1].highlight = HIGHLIGHT_SORTED;
                }
                StateHelper.updateCopyPush(statelist, state);
                swapped = true;
            } else {
                state.backlinks[i].highlight = HIGHLIGHT_NONE;
                if (i < end - 2) {
                    state.backlinks[i + 1].highlight = HIGHLIGHT_STANDARD;
                } else if (i === end - 2) {
                    state.backlinks[end - 1].highlight = HIGHLIGHT_SORTED;
                }
                StateHelper.updateCopyPush(statelist, state);
            }
        }

        if (!swapped) {
            break;
        }

        // Set swapped flag to run loop backward
        swapped = false;

        // Last index is already sorted
        end = end - 1;

        for (var i = end - 1; i > start; i--) {
            state.backlinks[i].highlight = HIGHLIGHT_STANDARD;
            StateHelper.updateCopyPush(statelist, state);

            if (i - 1 >= start) {
                state.backlinks[i - 1].highlight = HIGHLIGHT_SPECIAL;
                StateHelper.updateCopyPush(statelist, state);
            }

            if (state.backlinks[i].value < state.backlinks[i - 1].value) {
                EntryBacklinkHelper.swapBacklinks(state.backlinks, i, i - 1);
                StateHelper.updateCopyPush(statelist, state);

                state.backlinks[i].highlight = HIGHLIGHT_NONE;
                if (i === start + 1) {
                    state.backlinks[start].highlight = HIGHLIGHT_SORTED;
                }
                StateHelper.updateCopyPush(statelist, state);
                swapped = true;
            } else {
                state.backlinks[i].highlight = HIGHLIGHT_NONE;
                if (i > start + 1) {
                    state.backlinks[i - 1].highlight = HIGHLIGHT_STANDARD;
                } else if (i === start + 1) {
                    state.backlinks[start].highlight = HIGHLIGHT_SORTED;
                }
                StateHelper.updateCopyPush(statelist, state);
            }
        }

        // First index is already sorted
        start = start + 1;
    } // End while loop

    state.status = "List sorted!";
    for (var i = 0; i < numElements; i++) {
        state.backlinks[i].highlight = HIGHLIGHT_SORTED;
    }
    StateHelper.updateCopyPush(statelist, state);

    this.play(callback);
    return true;
}

this.shellSort = function (callback) {
    var numElements = statelist[0].backlinks.length;
    var state = StateHelper.copyState(statelist[0]);

    // Start big gap loop, then reduce gap by 1
    // You have to floor the gap, or it will get bug
    for (var gap = Math.floor(numElements / 2); gap > 0; gap = Math.floor(gap / 2)) {

        for (var i = gap; i < numElements; i++) {

            for (var j = i; j >= gap;) {
                state.backlinks[j].highlight = HIGHLIGHT_STANDARD;
                state.backlinks[j].secondaryPositionStatus = POSITION_USE_SECONDARY_IN_DEFAULT_POSITION;
                state.backlinks[j - gap].highlight = HIGHLIGHT_STANDARD;
                state.backlinks[j - gap].secondaryPositionStatus = POSITION_USE_SECONDARY_IN_DEFAULT_POSITION;
                StateHelper.updateCopyPush(statelist, state);
                if (state.backlinks[j - gap].value > state.backlinks[j].value) {
                    EntryBacklinkHelper.swapBacklinks(state.backlinks, j, j - gap);
                    StateHelper.updateCopyPush(statelist, state);

                    state.backlinks[j].secondaryPositionStatus = POSITION_USE_PRIMARY;
                    state.backlinks[j - gap].secondaryPositionStatus = POSITION_USE_PRIMARY;
                    StateHelper.updateCopyPush(statelist, state);


                    state.backlinks[j].highlight = HIGHLIGHT_NONE;
                    state.backlinks[j - gap].highlight = HIGHLIGHT_NONE;
                    StateHelper.updateCopyPush(statelist, state);
                } else {
                    state.backlinks[j].secondaryPositionStatus = POSITION_USE_PRIMARY;
                    state.backlinks[j - gap].secondaryPositionStatus = POSITION_USE_PRIMARY;
                    StateHelper.updateCopyPush(statelist, state);

                    state.backlinks[j].highlight = HIGHLIGHT_NONE;
                    state.backlinks[j - gap].highlight = HIGHLIGHT_NONE;
                    StateHelper.updateCopyPush(statelist, state);
                    break;
                }
                j -= gap;
            }
        } // End for i

    } // End for gap

    state.status = "List sorted!";
    for (var i = 0; i < numElements; i++) {
        state.backlinks[i].highlight = HIGHLIGHT_SORTED;
    }
    StateHelper.updateCopyPush(statelist, state);
    this.play(callback);

    return true;
}

this.mergeSort = function (callback) {
    var numElements = statelist[0].backlinks.length;
    var state = StateHelper.copyState(statelist[0]);

    populatePseudoCode([
        'split each element into partitions of size 1',
        'recursively merge adjancent partitions',
        '  for i = leftPartStartIndex to rightPartLastIndex inclusive',
        '    if leftPartHeadValue <= rightPartHeadValue',
        '      copy leftPartHeadValue',
        '    else: copy rightPartHeadValue',
        'copy elements back to original array'
    ]);

    this.mergeSortSplit(state, 0, numElements);

    state.status = "List sorted!";
    for (var i = 0; i < numElements; i++) {
        state.backlinks[i].highlight = HIGHLIGHT_SORTED;
    }
    StateHelper.updateCopyPush(statelist, state);
    this.play(callback);

    return true;
}

this.mergeSortSplit = function (state, startIndex, endIndex) {
    if (endIndex - startIndex <= 1) {
        return;
    }

    var midIndex = Math.ceil((startIndex + endIndex) / 2);
    this.mergeSortSplit(state, startIndex, midIndex);
    this.mergeSortSplit(state, midIndex, endIndex);
    this.mergeSortMerge(state, startIndex, midIndex, endIndex);

    // Copy sorted array back to original array
    state.status = "Copy sorted elements back to original array.";
    state.lineNo = 7;

    var duplicatedArray = new Array();
    for (var i = startIndex; i < endIndex; i++) {
        var newPosition = state.backlinks[i].secondaryPositionStatus;
        duplicatedArray[newPosition] = state.backlinks[i];
    }

    for (var i = startIndex; i < endIndex; i++) {
        state.backlinks[i] = duplicatedArray[i];
    }

    for (var i = startIndex; i < endIndex; i++) {
        state.backlinks[i].secondaryPositionStatus = POSITION_USE_PRIMARY;
        state.backlinks[i].highlight = HIGHLIGHT_NONE;
        StateHelper.updateCopyPush(statelist, state);
    }
}

this.mergeSortMerge = function (state, startIndex, midIndex, endIndex) {
    var leftIndex = startIndex;
    var rightIndex = midIndex;

    for (var i = startIndex; i < endIndex; i++) {
        state.backlinks[i].highlight = HIGHLIGHT_STANDARD;
    }
    state.lineNo = 2;
    StateHelper.updateCopyPush(statelist, state);

    for (var i = startIndex; i < endIndex; i++) {

        if (leftIndex < midIndex && (rightIndex >= endIndex || state.backlinks[leftIndex].value <= state.backlinks[rightIndex].value)) {
            state.backlinks[leftIndex].secondaryPositionStatus = i;
            state.lineNo = [3, 4, 5];

            leftIndex++;
            StateHelper.updateCopyPush(statelist, state);
        } else {
            state.backlinks[rightIndex].secondaryPositionStatus = i;
            state.lineNo  = [3, 6];

            rightIndex++;
            StateHelper.updateCopyPush(statelist, state);
        }
    }
}