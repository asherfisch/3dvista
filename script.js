document.addEventListener('DOMContentLoaded', () => {
    const panoramaContainer = document.getElementById('panorama');

    // Initialize Pannellum Viewer
    const viewer = pannellum.viewer('panorama', {
        "type": "equirectangular",
        "panorama": "https://pannellum.org/images/alma.jpg",
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
            seqEl.textContent = name;
            seqEl.className = 'sequence-item';
            if (name === currentSequenceName) {
                seqEl.classList.add('selected');
            }
            seqEl.addEventListener('click', () => {
                currentSequenceName = name;
                renderSequences();
                renderKeyframes();
                keyframesContainer.style.display = 'block';
                currentSequenceTitle.textContent = `Keyframes for: ${name}`;
            });
            sequencesList.appendChild(seqEl);
        }
    };

    const renderKeyframes = () => {
        keyframesList.innerHTML = '';
        if (currentSequenceName && sequences[currentSequenceName]) {
            sequences[currentSequenceName].keyframes.forEach((kf, index) => {
                const kfEl = document.createElement('div');
                kfEl.textContent = `Keyframe ${index + 1}: Yaw=${kf.yaw.toFixed(2)}, Pitch=${kf.pitch.toFixed(2)}, Zoom=${kf.hfov.toFixed(2)}`;
                keyframesList.appendChild(kfEl);
            });
        }
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
    };

    const addKeyframe = () => {
        if (currentSequenceName) {
            const yaw = viewer.getYaw();
            const pitch = viewer.getPitch();
            const hfov = viewer.getHfov();
            sequences[currentSequenceName].keyframes.push({ yaw, pitch, hfov, duration: 2, ease: "power2.inOut" });
            renderKeyframes();
        }
    };

    const playSequence = () => {
        if (currentSequenceName && sequences[currentSequenceName].keyframes.length > 0) {
            const sequence = sequences[currentSequenceName];
            const timeline = gsap.timeline();

            let startHfov = viewer.getHfov();
            let startYaw = viewer.getYaw();
            let startPitch = viewer.getPitch();

            sequence.keyframes.forEach((kf, index) => {
                const isFirst = index === 0;

                const animationProps = {
                    hfov: kf.hfov,
                    yaw: kf.yaw,
                    pitch: kf.pitch,
                    duration: kf.duration,
                    ease: kf.ease,
                    onUpdate: () => {
                        viewer.setHfov(animationProps.hfov, false);
                        viewer.setYaw(animationProps.yaw, false);
                        viewer.setPitch(animationProps.pitch, false);
                    }
                };

                const fromProps = {
                    hfov: isFirst ? startHfov : sequence.keyframes[index - 1].hfov,
                    yaw: isFirst ? startYaw : sequence.keyframes[index - 1].yaw,
                    pitch: isFirst ? startPitch : sequence.keyframes[index - 1].pitch,
                };

                timeline.fromTo(fromProps, animationProps, ">");
            });
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
});
