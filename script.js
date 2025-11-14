document.addEventListener('DOMContentLoaded', () => {
    const panoramaContainer = document.getElementById('panorama');

    // Initialize Pannellum Viewer
    const viewer = window.viewer = pannellum.viewer('panorama', {
        "type": "equirectangular",
        "panorama": "./alma.jpg",
        "autoLoad": true,
        "compass": false,
        "northOffset": 240,
        "showControls": false
    });

    let sequences = {};
    let currentSequenceName = null;

    // --- DOM Elements ---
    const newSequenceNameInput = document.getElementById('new-sequence-name');
    const addSequenceBtn = document.getElementById('add-sequence-btn');
    const sequencesList = document.getElementById('sequences-list');
    const keyframesContainer = document.getElementById('keyframes-container');
    const currentSequenceTitle = document.getElementById('current-sequence-title');
    const keyframesList = document.getElementById('keyframes-list');
    const addKeyframeBtn = document.getElementById('add-keyframe-btn');
    const playSequenceBtn = document.getElementById('play-sequence-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file');

    // --- Functions ---
    const renderSequences = () => {
        sequencesList.innerHTML = '';
        for (const name in sequences) {
            const seqEl = document.createElement('div');
            seqEl.className = 'sequence-item';

            const seqName = document.createElement('span');
            seqName.textContent = name;
            seqName.addEventListener('click', () => {
                currentSequenceName = name;
                renderSequences();
                renderKeyframes();
                keyframesContainer.style.display = 'block';
                currentSequenceTitle.textContent = `Keyframes for: ${name}`;
            });

            if (name === currentSequenceName) {
                seqEl.classList.add('selected');
            }

            const startFromCurrentCheckbox = document.createElement('input');
            startFromCurrentCheckbox.type = 'checkbox';
            startFromCurrentCheckbox.checked = sequences[name].options.startFromCurrent;
            startFromCurrentCheckbox.addEventListener('change', () => {
                sequences[name].options.startFromCurrent = startFromCurrentCheckbox.checked;
                updatePlayButtonState();
            });

            const label = document.createElement('label');
            label.textContent = 'Start from current position';
            label.prepend(startFromCurrentCheckbox);

            seqEl.appendChild(seqName);
            seqEl.appendChild(label);
            sequencesList.appendChild(seqEl);
        }
    };

    const renderKeyframes = () => {
        keyframesList.innerHTML = '';
        if (currentSequenceName && sequences[currentSequenceName]) {
            sequences[currentSequenceName].keyframes.forEach((kf, index) => {
                const kfEl = document.createElement('div');
                kfEl.className = 'keyframe-item';

                const kfInfo = document.createElement('div');
                kfInfo.innerHTML = `
                    <span>Keyframe ${index + 1}:</span>
                    <label>Yaw: <input type="number" class="kf-yaw" value="${kf.yaw.toFixed(2)}" step="0.1"></label>
                    <label>Pitch: <input type="number" class="kf-pitch" value="${kf.pitch.toFixed(2)}" step="0.1"></label>
                    <label>Zoom: <input type="number" class="kf-hfov" value="${kf.hfov.toFixed(2)}" step="0.1"></label>
                    <label>Duration: <input type="number" class="kf-duration" value="${kf.duration}" step="0.1"></label>
                    <label>Ease: <input type="text" class="kf-ease" value="${kf.ease}"></label>
                `;

                const saveBtn = document.createElement('button');
                saveBtn.textContent = 'Save';
                saveBtn.addEventListener('click', () => {
                    const newYaw = parseFloat(kfEl.querySelector('.kf-yaw').value);
                    const newPitch = parseFloat(kfEl.querySelector('.kf-pitch').value);
                    const newHfov = parseFloat(kfEl.querySelector('.kf-hfov').value);
                    const newDuration = parseFloat(kfEl.querySelector('.kf-duration').value);
                    const newEase = kfEl.querySelector('.kf-ease').value;

                    if (!isNaN(newYaw) && !isNaN(newPitch) && !isNaN(newHfov) && !isNaN(newDuration)) {
                        kf.yaw = newYaw;
                        kf.pitch = newPitch;
                        kf.hfov = newHfov;
                        kf.duration = newDuration;
                        kf.ease = newEase;
                        renderKeyframes();
                    }
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sequences[currentSequenceName].keyframes.splice(index, 1);
                    renderKeyframes();
                });

                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'keyframe-buttons';
                buttonsContainer.appendChild(saveBtn);
                buttonsContainer.appendChild(deleteBtn);

                kfEl.appendChild(kfInfo);
                kfEl.appendChild(buttonsContainer);
                keyframesList.appendChild(kfEl);
            });
        }
        updatePlayButtonState();
    };

    const addSequence = () => {
        const name = newSequenceNameInput.value.trim();
        if (name && !sequences[name]) {
            sequences[name] = {
                keyframes: [],
                options: {
                    startFromCurrent: false
                }
            };
            newSequenceNameInput.value = '';
            currentSequenceName = name;
            renderSequences();
            renderKeyframes();
            keyframesContainer.style.display = 'block';
            currentSequenceTitle.textContent = `Keyframes for: ${name}`;
        }
        updatePlayButtonState();
    };

    const addKeyframe = () => {
        if (currentSequenceName) {
            const yaw = viewer.getYaw();
            const pitch = viewer.getPitch();
            const hfov = viewer.getHfov();
            sequences[currentSequenceName].keyframes.push({ yaw, pitch, hfov, duration: 2, ease: "power2.inOut" });
            renderKeyframes();
        }
        updatePlayButtonState();
    };

    const playSequence = () => {
        if (currentSequenceName && sequences[currentSequenceName].keyframes.length > 0) {
            const sequence = sequences[currentSequenceName];
            const timeline = gsap.timeline();

            const cameraState = {
                yaw: viewer.getYaw(),
                pitch: viewer.getPitch(),
                hfov: viewer.getHfov()
            };

            // Set the initial state of the animation
            if (!sequence.options.startFromCurrent) {
                const firstKf = sequence.keyframes[0];
                if (firstKf) {
                    cameraState.yaw = firstKf.yaw;
                    cameraState.pitch = firstKf.pitch;
                    cameraState.hfov = firstKf.hfov;
                }
            }

            viewer.setYaw(cameraState.yaw, false);
            viewer.setPitch(cameraState.pitch, false);
            viewer.setHfov(cameraState.hfov, false);

            const keyframesToPlay = sequence.options.startFromCurrent ? sequence.keyframes : sequence.keyframes.slice(1);

            keyframesToPlay.forEach(kf => {
                timeline.to(cameraState, {
                    yaw: kf.yaw,
                    pitch: kf.pitch,
                    hfov: kf.hfov,
                    duration: kf.duration,
                    ease: kf.ease,
                    onUpdate: () => {
                        viewer.setYaw(cameraState.yaw, false);
                        viewer.setPitch(cameraState.pitch, false);
                        viewer.setHfov(cameraState.hfov, false);
                    }
                });
            });
        }
    };

    const updatePlayButtonState = () => {
        if (currentSequenceName && sequences[currentSequenceName]) {
            const sequence = sequences[currentSequenceName];
            const keyframesCount = sequence.keyframes.length;
            const startFromCurrent = sequence.options.startFromCurrent;

            if (keyframesCount === 0) {
                playSequenceBtn.disabled = true;
            } else if (startFromCurrent) {
                playSequenceBtn.disabled = false;
            } else {
                playSequenceBtn.disabled = keyframesCount < 2;
            }
        } else {
            playSequenceBtn.disabled = true;
        }
    };

    const exportSequences = () => {
        const data = JSON.stringify(sequences, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'panorama-sequences.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importSequences = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedSequences = JSON.parse(e.target.result);
                    sequences = importedSequences;
                    currentSequenceName = null;
                    renderSequences();
                    keyframesContainer.style.display = 'none';
                    alert('Sequences imported successfully!');
                } catch (error) {
                    alert('Error importing sequences: Invalid JSON file.');
                }
            };
            reader.readAsText(file);
        }
    };

    // --- Event Listeners ---
    addSequenceBtn.addEventListener('click', addSequence);
    addKeyframeBtn.addEventListener('click', addKeyframe);
    playSequenceBtn.addEventListener('click', playSequence);
    exportBtn.addEventListener('click', exportSequences);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importSequences);

    renderSequences();
    updatePlayButtonState();
});
