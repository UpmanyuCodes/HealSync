const slider = document.getElementById("pain");
const painValue = document.getElementById("painValue");
const submitBtn = document.getElementById("submitBtn");
const emojis = document.querySelectorAll(".emoji");

let selectedMood = null;

slider.addEventListener("input", () => {
  painValue.textContent = slider.value;
});

emojis.forEach((emoji) => {
  emoji.addEventListener("click", () => {
    emojis.forEach(e => e.classList.remove("selected"));
    emoji.classList.add("selected");
    selectedMood = emoji.textContent;
  });
});

submitBtn.addEventListener("click", () => {
  if (!selectedMood) {
    alert("Please select your mood emoji before submitting.");
    return;
  }
  alert(`Mood: ${selectedMood}\nPain Level: ${slider.value}`);
});
