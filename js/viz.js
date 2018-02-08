function initUI() {
    $('#actions-hide img').addClass('rotateLeft');
    $('#status-hide img').addClass('rotateRight');
    $('#codetrace-hide img').addClass('rotateRight');
    $('.create').hide();
    $('#play').hide();
}

function isActionsOpen() {
    return $('#actions-hide img').hasClass('rotateRight');
}

function isStatusOpen() {
    return $('#status-hide img').hasClass('rotateLeft');
}
function isCodetraceOpen() {
    return $('#codetrace-hide img').hasClass('rotateLeft');
}

function showActionsPanel() {
    if (!isActionsOpen()) {
        $('#actions-hide img').removeClass('rotateLeft').addClass('rotateRight');
        $('#actions').animate({width: "+=" + actionsWidth});
    }
}

function showCreateActionsPanel() {
    $('.create').show();
}

function hideCreateActionsPanel() {
    $('.create').hide();
    $('#create-err').html('');
}

function hideActionsPanel() {
    if (isActionsOpen()) {
        $('#actions-hide img').removeClass('rotateRight').addClass('rotateLeft');
        $('#actions').animate({width: "-=" + actionsWidth});
        hideCreateActionsPanel();
    }
}

function showStatusPanel() {
    if (!isStatusOpen()) {
        $('#status-hide img').removeClass('rotateRight').addClass('rotateLeft');
        $('#status').animate({width: "+=" + statusCodetraceWidth});
    }
}

function hideStatusPanel() {
    if (isStatusOpen()) {
        $('#status-hide img').removeClass('rotateLeft').addClass('rotateRight');
        $('#status').animate({width: "-=" + statusCodetraceWidth});
    }
}

function showCodetracePanel() {
    if (!isCodetraceOpen()) {
        $('#codetrace-hide img').removeClass('rotateRight').addClass('rotateLeft');
        $('#codetrace').animate({width: "+=" + statusCodetraceWidth});
    }
}

function hideCodetracePanel() {
    if (isCodetraceOpen()) {
        $('#codetrace-hide img').removeClass('rotateLeft').addClass('rotateRight');
        $('#codetrace').animate({width: "-=" + statusCodetraceWidth});
    }
}

$('#status-hide').click(function () {
    if (isStatusOpen()) {
        hideStatusPanel();
    } else {
        showStatusPanel();
    }
});

$('#codetrace-hide').click(function () {
    if (isCodetraceOpen()) {
        hideCodetracePanel();
    } else {
        showCodetracePanel();
    }
});

$('#actions-hide').click(function () {
    if (isActionsOpen()) {
        hideActionsPanel();
    } else {
        showActionsPanel();
    }
});

this.play = function (callback) {
    if (!issPlaying) {
        issPlaying = true;
        drawCurrentState();
        animInterval = setInterval(function () {
            drawCurrentState();
            if (currentStep < (statelist.length - 1))
                currentStep++;
            else {
                clearInterval(animInterval);
                if (typeof callback == 'function') callback();
            }
        }, transitionTime);
        $('#pause').show();
        $('#play').hide();
    }
};

this.pause = function () {
    issPlaying = false;
    clearInterval(animInterval);
    if (animInterval !== undefined) {
        $('#pause').hide();
        $('#play').show();
    }
};

this.goToBeginning = function () {
    if (issPlaying) {
        pause();
    }
    currentStep = 0;
    drawState(currentStep);
};

this.stepBackward = function () {
    if (issPlaying) {
        pause();
    }
    if (currentStep > 0) {
        currentStep--;
        drawState(currentStep);
    }
};

this.stepForward = function () {
    if (issPlaying) {
        pause();
    }
    if (currentStep < statelist.length - 1) {
        currentStep++;
        drawState(currentStep);
    }
};

this.goToEnd = function () {
    if (issPlaying) {
        pause();
    }
    currentStep = statelist.length - 1;
    drawState(currentStep)
};