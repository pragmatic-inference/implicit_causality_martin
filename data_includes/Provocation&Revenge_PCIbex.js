PennController.ResetPrefix(null);

// fallback Prolific ID
// https://farm.pcibex.net/p/xxxxxx/?PROLIFIC_PID=abc123&STUDY_ID=yyy&SESSION_ID=zzz
window.PROLIFIC_ID =
  GetURLParameter("PROLIFIC_PID") ||
  ("tmp_" + Math.random().toString(36).slice(2));
window.STUDY_ID = GetURLParameter("STUDY_ID") || "";
window.SESSION_ID = GetURLParameter("SESSION_ID") || "";

// new: q onset timestamp
window.__qOnset = window.__qOnset || { practice: {}, critical: {} };

// NEW: whole-experiment timing
window.__expStart = window.__expStart || Date.now();
window.__expEnd = null;
window.__expDuration = null;

// NEW: critical-section timing
window.__criticalStart = null;
window.__criticalEnd = null;
window.__criticalDuration = null;

// NEW: optional midpoint break tracking
window.__breakCountdownInterval = null;
window.__breakCountdownFinished = false;
window.__breakTaken = 0;             // 1 if the participant chose the break, else 0
window.__breakStart = null;
window.__breakEnd = null;
window.__breakDuration = 0;          // accumulated break duration in ms
window.__criticalDurationNet = null; // critical duration excluding break

Header().log("PROLIFIC_ID", window.PROLIFIC_ID)
        .log("STUDY_ID", window.STUDY_ID)
        .log("SESSION_ID", window.SESSION_ID);


// Add custom CSS for larger answer options
Header(
    newFunction("addCSS", function() {
        var style = document.createElement('style');
        style.innerHTML = `
        /* 1) Reduce the top margin from the entire page (from css_includes) */
            body { margin-top: 48px !important; }
        /* 2) Crucial: Reduce the large margin-top from the innermost sentence 
        within the DashedSentence element. */
            .dashedsentence-sentence,
            .DashedSentence-sentence {
                margin-top: 40px !important;   /* 20/30/50/60 */
                margin-bottom: 0 !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
            }
        /* 3) Reset the outer layer as well (optional) */
            .penncontroller-spr.dashedsentence-dashedsentence,
            .PennController-spr.DashedSentence-DashedSentence {
                height: auto !important;
                min-height: 0 !important;
                margin-top: 0 !important;
                margin-bottom: 0 !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
         }
            .instHint { font-size: 24px !important; font-style: italic; }
            .Question-choice {
                font-size: 1.5em !important;
                padding: 0.5em 1em !important;
                margin: 0 1em !important;
            }
            .Question td {
                font-size: 1.5em !important;
                padding: 0.5em 1em !important;
            }
            .Question-answer {
                font-size: 3em !important;
                padding: 1em 2em !important;
                border: 2px solid #ccc !important;
                border-radius: 8px !important;
            }
        `;
        document.head.appendChild(style);
    }).call()
);

var confirmationLink = "https://app.prolific.com/submissions/complete?cc=CNAM6AA1";

// Fisher-Yates shuffle function for randomization
function fisherYates(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// helper to randomize 
function flipCorrectKey(c) {
  c = String(c || "");
  if (c === "F") return "J";
  if (c === "J") return "F";
  return c; // "FJ" stays "FJ"
}
// end of helper

Sequence("consent", 
  "instructions", 
  "practice", 
  "go", 
  "critical_firsthalf", 
  "mid_break", 
  "critical_secondhalf", 
  "record_critical_time",
  "conclude", "exit", "demo", "debrief", "record_total_time", SendResults(), "submit");

newTrial("consent",
    newHtml("consent_form", "consent.html")
        .cssContainer({"width":"720px"})
        .checkboxWarning("Sie müssen zustimmen, bevor Sie fortfahren können.")
        .print()
    ,
    newButton("continue", "Zustimmen und fortfahren")
        .css({
            "margin-top": "20px",
            "padding": "12px 24px",
            "font-size": "16px",
            "cursor": "pointer",
            "background-color": "#a51e37",
            "color": "white",
            "border": "none",
            "border-radius": "4px"
        })
        .cssContainer({"margin-bottom":"1em"})
        .center()
        .print()
        .wait(getHtml("consent_form").test.complete()
                  .failure(getHtml("consent_form").warn())
        )
);

newTrial("instructions",
    // unified defaults for all instruction texts
    defaultText
        .css({
            "font-size": "24px",
            "line-height": "1.6",
            "text-align": "left"
        })
        .cssContainer({
            "width": "900px",
            "margin": "0 auto",
            "margin-bottom": "18px"
        })
        .print()
    ,

    // -------- PAGE 1 --------
    newText("inst-1", "<div style='text-align:center; font-size:30px; font-weight:700;'>Willkommen!</div>"),
    newText("inst-2", "In diesem Experiment lesen Sie Sätze auf Deutsch, jeweils ein oder zwei Wörter auf einmal."),
    newText("inst-3", "Sie können durch die Leertaste durch jeden Satz weitergehen."),
    newButton("wait1", "Klicken Sie hier, um fortzufahren")
        .cssContainer({"margin-top":"18px"})
        .center()
        .print()
        .wait()
    ,
    clear(),

    // -------- PAGE 2 --------
    newText("inst-4", "Nach jedem Satz werden Sie gebeten, eine kurze Frage zu beantworten, die sich auf den Inhalt des Satzes bezieht."),
    newText("inst-5", "Diese haben immer zwei mögliche Antworten, auf der linken und rechten Seite des Bildschirms."),
    newText("inst-6", "Sie haben 12 Sekunden Zeit, um Ihre Antworten mit den Tasten F und J einzugeben."),
    newText("inst-coref", "Bitte entscheiden Sie schon beim Lesen, auf wen/was sich das Pronomen bezieht, damit Sie nach dem Satz sofort antworten können.")
        .css({"margin-top":"10px"})
    ,
    newText("inst-keymap", "<b>Tastenbelegung:</b> F = links, J = rechts.")
        .css({
            "margin-top": "14px",
            "font-size": "26px"
        })
    ,
    newButton("wait2", "Klicken Sie hier, um fortzufahren")
        .cssContainer({"margin-top":"18px"})
        .center()
        .print()
        .wait()
    ,
    clear(),

    // -------- PAGE 3 --------
    newText("inst-7", "Sie sollten den Text natürlich lesen und die Fragen so gut wie möglich anhand des Gelesenen beantworten."),
    newText("inst-8", "Achten Sie auf jeden Teil des Satzes."),
    newText("inst-9", "Wir beginnen mit einigen geführten Übungen."),
    newButton("wait", "Klicken Sie hier, um das Experiment durchzuführen")
        .cssContainer({"margin-top":"18px"})
        .center()
        .print()
        .wait()
);

Template("Practice_german.csv", row =>
    newTrial("practice",
        // newVar("q_onset_practice_ms", ""),
        newText("practice_inst", "Drücken Sie die Leertaste, um im Satz fortzufahren.")
            .cssContainer({"font-size":"24px", "font-style": "italic", "margin-bottom": "1em"})
            .center()
            .print(),
        newController("spr", "DashedSentence", { s: row.story })
            .cssContainer({ width: "100%", "max-width": "1300px", margin: "0 auto" })
            .center()
            .log()
            .print()
            .wait()
        ,
        clear(),
        newText("preq_text_practice", "Bitte warten Sie auf die Frage.")
            .cssContainer({"font-size":"24px", "font-style": "italic", "margin-bottom": "1em"})
            .center()
            .print()
        ,
        newTimer("preq_practice", 1000) // duration of pause before question
            .start()
            .wait()
        ,
        clear(),
        newController("Question", {q: row.question, 
            as: [["F",row.left], ["J", row.right]],
            randomOrder: false,
            presentHorizontally: true
        })
            .center()
            .print()
            .log()
        ,
        // new: record q onset time
        newFunction("set_q_onset_practice_" + row.item, () => {
          window.__qOnset.practice[String(row.item)] = Date.now();
        }).call(),
        
        
        
        newText("practice_inst2", "Antworten Sie mit den Tasten F und J.")
            .cssContainer({"margin-top":"2em","font-size":"24px", "font-style": "italic"})
            .center()
            .print(),
        newTimer("timeout_practice", 12000) // timeout for question
            .start()
        ,
        newKey("answer_practice", "FJ") //F key for left choice, J key for right choice
            .callback( getTimer("timeout_practice").stop() ) //stops timer if key is clicked
            .log("first")
            .cssContainer({"line-height": "150%"})
        ,
        getTimer("timeout_practice")
            .wait()
        ,
        clear(),
        // Check if F was pressed
        getKey("answer_practice")
            .test.pressed("F")
            .success(
                // F was pressed - check if F is a correct answer
                row.correct.includes("F") 
                    ? newText("success_f_practice", row.correct=="FJ" ? "Beide Antworten sind möglich" : "Richtig!")
                        .css({ "font-size": "24px", "font-weight": "400" })
                        .center()
                        .cssContainer({"line-height": "150%", "margin-bottom": "1em"})
                        .print()
                    : newText("failure_f_practice", "Falsch")
                        .css({ "font-size": "24px", "font-weight": "400", "color": "red" })
                        .center()
                        .cssContainer({"color": "red", "line-height": "150%", "margin-bottom": "1em"})
                        .print()
            )
            .failure(
                // F was NOT pressed - check if J was pressed
                getKey("answer_practice").test.pressed("J")
                    .success(
                        // J was pressed - check if J is a correct answer
                        row.correct.includes("J")
                            ? newText("success_j_practice", row.correct=="FJ" ? "Beide Antworten sind möglich" : "Richtig!")
                                .css({ "font-size": "24px", "font-weight": "400" })
                                .center()
                                .cssContainer({"line-height": "150%", "margin-bottom": "1em"})
                                .print()
                            : newText("failure_j_practice", "Falsch")
                                .css({ "font-size": "24px", "font-weight": "400", "color": "red" })
                                .center()
                                .cssContainer({"color": "red", "line-height": "150%", "margin-bottom": "1em"})
                                .print()
                    )
                    .failure(
                        // Neither F nor J pressed (timeout)
                        newText("timeout_practice", "Die Zeit ist um")
                            .css({ "font-size": "24px", "font-weight": "400" })
                            .center()
                            .cssContainer({"color": "red", "line-height": "150%", "margin-bottom": "1em"})
                            .print()
                    )
            )
        ,
        newText("comment_practice", row.comment)
            .cssContainer({"margin-bottom": "1em"})
            .center()
            .print()
        ,
        newText("wait_practice", "Bitte warten Sie auf den nächsten Satz.")
            .cssContainer({"font-size":"24px", "font-style": "italic", "margin-bottom": "1em"})
            .center()
            .print()
        ,
        newTimer("afterQuestion_practice", 5000) // how long the message is presented for
            .start()
            .wait()
    )
    .log("q_onset_practice_ms", () => window.__qOnset.practice[String(row.item)] ?? "")
    .log("story")
    .log("group", null)
    .log("item", row.item)
    .log("condition", null)
    .log("qtype", null)
    .log("correctKey", row.correct)
);

newTrial("go",
    defaultText
        .css({ "font-size": "28px", "line-height": "1.6", "text-align":"left"})
        .cssContainer({"margin-bottom":"1em"})
        .print(),
    newText("go-1", "Das war's mit dem Training."),
    newText("go-2", "Zur Erinnerung: Lesen Sie mit der Leertaste und beantworten Sie dann jede Frage mit den Tasten F und J (F = linke Antwort, J = rechte Antwort)."),
    newText("go-3", "Vergessen Sie nicht, natürlich, aber sorgfältig zu lesen und so gut wie möglich zu antworten."),
    newText("go-4", "Vielen Dank! Klicken Sie unten, wenn Sie bereit sind, zu beginnen."),
    newButton("wait", "Klicken Sie hier, um fortzufahren")
        .center()
        .print()
        .wait()
);



newTrial("mid_break",
  newText("break_title",
    "<div style='text-align:center; font-size:32px; font-weight:700;'>Kurze Pause</div>"
  ).print(),

  newText("break_msg",
    "Sie haben die Hälfte des Hauptteils erreicht. " +
    "Sie können jetzt eine optionale Pause von 5 Minuten machen oder direkt weitermachen."
  )
    .css({ "font-size":"28px", "line-height":"1.6" })
    .cssContainer({ "width":"900px", "margin":"0 auto", "margin-bottom":"1.5em" })
    .print(),

  newButton("take_break", "5 Minuten Pause machen")
    .css({
      "font-size":"22px",
      "padding":"12px 20px",
      "margin-right":"20px",
      "cursor":"pointer"
    })
    .print(),

  newButton("skip_break", "Ohne Pause fortfahren")
    .css({
      "font-size":"22px",
      "padding":"12px 20px",
      "cursor":"pointer"
    })
    .print(),

  newSelector("break_choice")
    .add(getButton("take_break"), getButton("skip_break"))
    .wait(),

  getSelector("break_choice")
    .test.selected(getButton("take_break"))
    .success(
      newFunction("break_start", function() {
        window.__breakTaken = 1;
        window.__breakStart = Date.now();
      }).call(),

      clear(),

      newText("break_running_title",
        "<div style='text-align:center; font-size:32px; font-weight:700;'>Pause läuft</div>"
      ).print(),

     newText("break_running_msg",
  "Sie haben jetzt bis zu 5 Minuten Pause. Nach Ablauf der 5 Minuten klicken Sie bitte auf „Weiter“, wenn Sie bereit sind."
)
  .css({ "font-size":"28px", "line-height":"1.6" })
  .cssContainer({ "width":"900px", "margin":"0 auto", "margin-bottom":"1em" })
  .print(),

newText("break_countdown",
  "<div id='break-countdown' style='text-align:center; font-size:42px; font-weight:700; margin: 20px 0;'>05:00</div>"
).print(),

newButton("end_break_manually", "Weiter")
  .css({
    "font-size":"22px",
    "padding":"12px 24px",
    "cursor":"pointer"
  })
  .center()
  .print(),

newFunction("start_break_countdown", function() {
  const totalSeconds = 300; // 5 minutes
  let remaining = totalSeconds;

  const el = document.getElementById("break-countdown");
  if (el) {
    el.textContent = "05:00";
  }

  window.__breakCountdownFinished = false;

  window.__breakCountdownInterval = setInterval(function() {
    remaining -= 1;

    const minutes = String(Math.floor(Math.max(remaining, 0) / 60)).padStart(2, "0");
    const seconds = String(Math.max(remaining, 0) % 60).padStart(2, "0");

    const el = document.getElementById("break-countdown");
    if (el) {
      el.textContent = minutes + ":" + seconds;
    }

    if (remaining <= 0) {
      clearInterval(window.__breakCountdownInterval);
      window.__breakCountdownInterval = null;
      window.__breakCountdownFinished = true;

      const msg = document.getElementById("break-ready-msg");
      if (msg) {
        msg.innerHTML = "Die 5 Minuten sind vorbei. Klicken Sie auf <b>Weiter</b>, wenn Sie fortfahren möchten.";
      }
    }
  }, 1000);
}).call(),

newText("break_ready_hint",
  "<div id='break-ready-msg' style='text-align:center; font-size:24px; margin-top:10px;'></div>"
).print(),

getButton("end_break_manually")
  .wait(),

newFunction("stop_break_countdown", function() {
  if (window.__breakCountdownInterval) {
    clearInterval(window.__breakCountdownInterval);
    window.__breakCountdownInterval = null;
  }
}).call(),

newFunction("break_end", function() {
  window.__breakEnd = Date.now();
  if (window.__breakStart !== null) {
    window.__breakDuration += (window.__breakEnd - window.__breakStart);
  }
}).call(),

clear(),

newText("break_over",
  "Das Experiment geht jetzt weiter."
)
  .css({ "font-size":"28px", "line-height":"1.6" })
  .center()
  .print(),

newTimer("after_break_resume", 800)
  .start()
  .wait()
    )
)
.log("is_break_trial", 1)
.log("break_taken", () => window.__breakTaken ?? 0)
.log("break_start_ms", () => window.__breakStart ?? "")
.log("break_end_ms", () => window.__breakEnd ?? "")
.log("break_duration_ms", () => window.__breakDuration ?? 0);

newTrial("conclude",
    defaultText
        .css({ "font-size":"28px", "line-height":"1.6", "text-align":"left" })
        .cssContainer({"margin-bottom":"1em"})
        .print(),
    newText("end-1", "Sie haben nun den Hauptteil des Experiments abgeschlossen."),
    newText("end-2", "Bevor Sie fertig sind, haben wir noch drei kurze Formulare für Sie zum Ausfüllen."),
    newText("end-3", "Nachdem alle drei Schritte ausgeführt wurden, werden Sie zur Bestätigung zu Prolific weitergeleitet."),
    newText("end-4", "Klicken Sie unten, um diese Formulare auszufüllen."),
    newButton("wait", "Klicken Sie hier, um fortzufahren")
        .center()
        .print()
        .wait()
);

newTrial("exit",
    newHtml("exit_form", "exit.html")
        .cssContainer({"width":"720px"})
        .inputWarning("Sie müssen alle Fragen beantworten, bevor Sie fortfahren können.")
        .print().log()
    ,
    newButton("continue", "Klicken Sie hier, um fortzufahren")
        .cssContainer({"margin-bottom":"1em"})
        .center()
        .print()
        .wait(getHtml("exit_form").test.complete()
                  .failure(getHtml("exit_form").warn())
        )
);

newTrial("demo",
    newHtml("demo_form", "demo.html")
        .cssContainer({"width":"720px"})
        .inputWarning("Sie müssen alle Fragen beantworten, bevor Sie fortfahren können.")
        .print().log()
    ,
    newButton("continue", "Klicken Sie hier, um fortzufahren")
        .cssContainer({"margin-bottom":"1em"})
        .center()
        .print()
        .wait(getHtml("demo_form").test.complete()
                  .failure(getHtml("demo_form").warn())
        )
);

newTrial("debrief",
    newHtml("debrief_form", "debrief.html")
        .cssContainer({"width":"720px"})
        .print()
    ,
    newButton("continue", "Klicken Sie hier, um fortzufahren")
        .cssContainer({"margin-bottom":"1em"})
        .center()
        .print()
        .wait()
);

newTrial("record_total_time",
    newFunction("store_total_time", function() {
        window.__expEnd = Date.now();
        window.__expDuration = window.__expEnd - window.__expStart;
    }).call()
)
.log("exp_start_ms", () => window.__expStart ?? "")
.log("exp_end_ms", () => window.__expEnd ?? "")
.log("exp_duration_ms", () => window.__expDuration ?? "")
.log("exp_duration_sec", () =>
    window.__expDuration != null
        ? (window.__expDuration / 1000).toFixed(3)
        : ""
);

newTrial("record_critical_time",
    newFunction("store_critical_time", function() {
        window.__criticalEnd = Date.now();

        if (window.__criticalStart !== null) {
            // gross duration: includes optional break
            window.__criticalDuration = window.__criticalEnd - window.__criticalStart;

            // net duration: excludes optional break
            window.__criticalDurationNet =
                window.__criticalDuration - (window.__breakDuration || 0);
        }
    }).call()
)
.log("critical_start_ms", () => window.__criticalStart ?? "")
.log("critical_end_ms", () => window.__criticalEnd ?? "")
.log("critical_duration_ms_gross", () => window.__criticalDuration ?? "")
.log("critical_duration_sec_gross", () =>
    window.__criticalDuration != null
        ? (window.__criticalDuration / 1000).toFixed(3)
        : ""
)
.log("break_taken", () => window.__breakTaken ?? 0)
.log("break_start_ms", () => window.__breakStart ?? "")
.log("break_end_ms", () => window.__breakEnd ?? "")
.log("break_duration_ms", () => window.__breakDuration ?? 0)
.log("break_duration_sec", () =>
    window.__breakDuration != null
        ? (window.__breakDuration / 1000).toFixed(3)
        : "0.000"
)
.log("critical_duration_ms_net", () => window.__criticalDurationNet ?? "")
.log("critical_duration_sec_net", () =>
    window.__criticalDurationNet != null
        ? (window.__criticalDurationNet / 1000).toFixed(3)
        : ""
);

newTrial("submit" ,
     newText("<p>Vielen Dank für Ihre Teilnahme!</p>")
                .center()
            .print()
    ,
    newText("<a href='"+confirmationLink+"' target='_blank' style='font-weight: bold;'>Klicken Sie hier für die Bestätigung auf Prolific</a>"+
    "<p>Dies ist ein notwendiger Schritt, damit Sie Ihre Zahlung erhalten können!</p>")
    .center()
    .print()
    ,
    newButton("void")
    .wait()
    )