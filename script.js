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
    document.getElementById('yaw-slider').addEventListener('input', (e) => {
        cameraState.yaw = parseFloat(e.target.value);
        setCameraState(cameraState);
    });

    document.getElementById('pitch-slider').addEventListener('input', (e) => {
        cameraState.pitch = parseFloat(e.target.value);
        setCameraState(cameraState);
    });

    document.getElementById('hfov-slider').addEventListener('input', (e) => {
        cameraState.hfov = parseFloat(e.target.value);
        setCameraState(cameraState);
    });

    // Event listener for adding a keyframe to the current sequence
    document.getElementById('add-keyframe-to-sequence').addEventListener('click', () => {
        if (currentSequence !== null) {
            sequences[currentSequence].keyframes.push({ ...cameraState });
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
    if (sequence.keyframes.length < 2) {
        alert('Please add at least two keyframes to this sequence.');
        return;
    }

    const tl = gsap.timeline({
        onUpdate: () => setCameraState(cameraState)
    });

    const keyframesToPlay = [...sequence.keyframes];
    if (sequence.startFromCurrentPosition) {
        keyframesToPlay.unshift({ ...cameraState });
    }

    keyframesToPlay.forEach((keyframe, i) => {
        if (i === 0) {
            gsap.set(cameraState, {
                yaw: keyframe.yaw,
                pitch: keyframe.pitch,
                hfov: keyframe.hfov
            });
        } else {
            tl.to(cameraState, {
                yaw: keyframe.yaw,
                pitch: keyframe.pitch,
                hfov: keyframe.hfov,
                duration: 2,
                ease: "power2.inOut"
            });
        }
    });
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
                <span>Keyframe ${index + 1}: Yaw: ${keyframe.yaw.toFixed(1)}, Pitch: ${keyframe.pitch.toFixed(1)}, Zoom: ${keyframe.hfov.toFixed(1)}</span>
                <button onclick="deleteKeyframe(${index})">Delete</button>
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

function updateUI() {
    document.getElementById('yaw-slider').value = cameraState.yaw;
    document.getElementById('yaw-value').textContent = cameraState.yaw.toFixed(1);
    document.getElementById('pitch-slider').value = cameraState.pitch;
    document.getElementById('pitch-value').textContent = cameraState.pitch.toFixed(1);
    document.getElementById('hfov-slider').value = cameraState.hfov;
    document.getElementById('hfov-value').textContent = cameraState.hfov.toFixed(1);
}