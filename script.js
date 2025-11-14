// Pannellum viewer instance
let viewer;

// Camera state object
const cameraState = {
    yaw: 0,
    pitch: 0,
    hfov: 100
};

// Sequences array
let sequences = [];
let currentSequence = null;

// Function to get the current camera state from the Pannellum viewer
function getCameraState() {
    cameraState.yaw = viewer.getYaw();
    cameraState.pitch = viewer.getPitch();
    cameraState.hfov = viewer.getHfov();
}

// Function to set the Pannellum viewer's camera state from an object
function setCameraState(state) {
    viewer.lookAt(state.pitch, state.yaw, state.hfov, 0);
}

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Pannellum viewer
    viewer = pannellum.viewer('panorama', {
        "type": "equirectangular",
        "panorama": "https://pannellum.org/images/alma.jpg",
        "autoLoad": true,
        "compass": true,
        "autoRotate": -2
    });

    // Update the cameraState object whenever the view changes
    viewer.on('viewchange', () => {
        getCameraState();
        updateUI();
    });

    // Event listeners for sliders
    document.getElementById('hfov-slider').addEventListener('input', (e) => {
        cameraState.hfov = parseFloat(e.target.value);
        setCameraState(cameraState);
    });

    // Event listener for adding a keyframe to the current sequence
    document.getElementById('add-keyframe-to-sequence').addEventListener('click', () => {
        if (currentSequence !== null) {
            const duration = parseFloat(document.getElementById('keyframe-duration').value);
            const ease = document.getElementById('keyframe-ease').value;
            sequences[currentSequence].keyframes.push({ ...cameraState, duration, ease });
            renderKeyframes();
        }
    });

    // Event listener for exporting sequences
    document.getElementById('export-sequences').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sequences, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "sequences.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    // Event listener for importing sequences
    document.getElementById('import-sequences').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedSequences = JSON.parse(e.target.result);
                    sequences = importedSequences;
                    renderSequences();
                } catch (error) {
                    alert('Error parsing JSON file.');
                }
            };
            reader.readAsText(file);
        }
    });

    // Event listener for adding a new sequence
    document.getElementById('add-sequence').addEventListener('click', () => {
        const sequenceNameInput = document.getElementById('sequence-name-input');
        const sequenceName = sequenceNameInput.value.trim();

        if (sequenceName) {
            const newSequence = {
                name: sequenceName,
                keyframes: [],
                startFromCurrentPosition: false
            };
            sequences.push(newSequence);
            sequenceNameInput.value = '';
            renderSequences();
        } else {
            alert('Please enter a name for the sequence.');
        }
    });
});

function renderSequences() {
    const sequenceList = document.getElementById('sequence-list');
    sequenceList.innerHTML = '';
    sequences.forEach((sequence, index) => {
        const sequenceElement = document.createElement('div');
        sequenceElement.innerHTML = `
            <span>${sequence.name}</span>
            <button onclick="selectSequence(${index})">Select</button>
            <button onclick="playSequence(${index})">Play</button>
            <button onclick="deleteSequence(${index})">Delete</button>
            <input type="checkbox" onchange="toggleStartFromCurrentPosition(${index})" ${sequence.startFromCurrentPosition ? 'checked' : ''}> Start from current position
        `;
        sequenceList.appendChild(sequenceElement);
    });
}

function selectSequence(index) {
    currentSequence = index;
    document.getElementById('current-sequence-name').textContent = sequences[index].name;
    document.getElementById('add-keyframe-to-sequence').disabled = false;
    renderKeyframes();
}

function deleteSequence(index) {
    sequences.splice(index, 1);
    if (currentSequence === index) {
        currentSequence = null;
        document.getElementById('current-sequence-name').textContent = '...';
        document.getElementById('add-keyframe-to-sequence').disabled = true;
    }
    renderSequences();
    renderKeyframes();
}

function playSequence(index) {
    const sequence = sequences[index];

    if (sequence.keyframes.length === 0) {
        alert('This sequence has no keyframes.');
        return;
    }

    // If not starting from current position and there's only one keyframe, just set the camera position.
    if (!sequence.startFromCurrentPosition && sequence.keyframes.length < 2) {
        setCameraState(sequence.keyframes[0]);
        return;
    }

    const tl = gsap.timeline({
        onUpdate: () => setCameraState(cameraState)
    });

    const keyframesToPlay = [...sequence.keyframes];

    if (sequence.startFromCurrentPosition) {
        // Create a temporary keyframe for the starting position.
        // The transition from here to the first saved keyframe will use the first keyframe's properties.
        const startKeyframe = {
            ...cameraState,
            duration: keyframesToPlay[0].duration,
            ease: keyframesToPlay[0].ease,
        };
        keyframesToPlay.unshift(startKeyframe);
        // Set the GSAP proxy object to the starting state without moving the camera yet.
        gsap.set(cameraState, { yaw: startKeyframe.yaw, pitch: startKeyframe.pitch, hfov: startKeyframe.hfov });
    } else {
        // Set the camera immediately to the first keyframe's position.
        gsap.set(cameraState, { ...keyframesToPlay[0] });
        setCameraState(keyframesToPlay[0]);
    }

    // Build the timeline. The transition from keyframe `i` to `i+1` uses the duration/ease properties from keyframe `i`.
    // This ensures the properties on the first keyframe are used for the first animation segment.
    for (let i = 0; i < keyframesToPlay.length - 1; i++) {
        const startKF = keyframesToPlay[i];
        const endKF = keyframesToPlay[i + 1];

        tl.to(cameraState, {
            yaw: endKF.yaw,
            pitch: endKF.pitch,
            hfov: endKF.hfov,
            duration: startKF.duration,
            ease: startKF.ease,
        });
    }
}

function toggleStartFromCurrentPosition(index) {
    sequences[index].startFromCurrentPosition = !sequences[index].startFromCurrentPosition;
}

function renderKeyframes() {
    const keyframeList = document.getElementById('keyframe-list');
    keyframeList.innerHTML = '';
    if (currentSequence !== null) {
        sequences[currentSequence].keyframes.forEach((keyframe, index) => {
            const keyframeElement = document.createElement('div');
            keyframeElement.innerHTML = `
                <span>
                    Keyframe ${index + 1}:
                    Yaw: ${keyframe.yaw.toFixed(1)},
                    Pitch: ${keyframe.pitch.toFixed(1)},
                    Zoom: ${keyframe.hfov.toFixed(1)},
                    Duration: ${keyframe.duration}s,
                    Ease: ${keyframe.ease}
                </span>
                <div>
                    <button onclick="updateKeyframe(${index})">Update</button>
                    <button onclick="deleteKeyframe(${index})">Delete</button>
                </div>
            `;
            keyframeList.appendChild(keyframeElement);
        });
    }
}

function deleteKeyframe(index) {
    if (currentSequence !== null) {
        sequences[currentSequence].keyframes.splice(index, 1);
        renderKeyframes();
    }
}

function updateKeyframe(index) {
    if (currentSequence !== null) {
        const duration = parseFloat(document.getElementById('keyframe-duration').value);
        const ease = document.getElementById('keyframe-ease').value;
        sequences[currentSequence].keyframes[index] = { ...cameraState, duration, ease };
        renderKeyframes();
    }
}

function updateUI() {
    document.getElementById('hfov-slider').value = cameraState.hfov;
    document.getElementById('hfov-value').textContent = cameraState.hfov.toFixed(1);
}