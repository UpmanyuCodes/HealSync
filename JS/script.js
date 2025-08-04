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

submitBtn.addEventListener("click", async () => {
  if (!selectedMood) {
    alert("Please select your mood emoji before submitting.");
    return;
  }

  const moodData = {
    mood: selectedMood,
    painLevel: slider.value
  };

  try {
    const response = await fetch("https://healsync-backend-d788.onrender.com/v1/healsync/emotion/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(moodData)
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const result = await response.json();
    console.log("API Response:", result);
    alert("Mood and pain level submitted successfully!");
  } catch (error) {
    console.error("Submission error:", error);
    alert("Failed to submit. Please try again later.");
  }
});
