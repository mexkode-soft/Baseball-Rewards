"use client";

import { CheckCircle2, Plus, Save, Tag, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import styles from "./Preguntas.module.css";

type Category = "baseball" | "general" | "marca";

interface Question {
  id: number;
  text: string;
  category: Category;
  brand?: string;
  answers: [string, string, string];
  correctAnswer: number;
}

const initialQuestions: Question[] = [
  { id: 1, text: "¿Cuántos strikes provocan un ponche?", category: "baseball", answers: ["Dos", "Tres", "Cuatro"], correctAnswer: 1 },
  { id: 2, text: "¿Cuál es la capital de México?", category: "general", answers: ["Monterrey", "Guadalajara", "Ciudad de México"], correctAnswer: 2 },
  { id: 3, text: "¿Qué experiencia ofrece Home Run Rewards?", category: "marca", brand: "Home Run Rewards", answers: ["Campañas interactivas", "Venta de autos", "Cursos"], correctAnswer: 0 },
];

export default function Page() {
  const [questions, setQuestions] = useState(initialQuestions);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category>("baseball");
  const [brand, setBrand] = useState("");
  const [answers, setAnswers] = useState(["", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(0);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || answers.some((answer) => !answer.trim())) return;

    setQuestions((current) => [
      {
        id: Date.now(),
        text: text.trim(),
        category,
        brand: category === "marca" ? brand.trim() : undefined,
        answers: [answers[0], answers[1], answers[2]],
        correctAnswer,
      },
      ...current,
    ]);

    setText("");
    setBrand("");
    setAnswers(["", "", ""]);
    setCorrectAnswer(0);
  }

  return (
    <>
      <div className={styles.pageTitle}>
        <span>Home Run Rewards</span>
        <h1>Listado de preguntas</h1>
        <p>Administra las preguntas que alimentan la trivia de recompensas.</p>
      </div>

      <div className={styles.layout}>
        <section className={styles.card}>
          <div className={styles.heading}><Plus /><div><span>Nueva pregunta</span><h2>Configuración</h2></div></div>
          <form className={styles.form} onSubmit={save}>
            <label>Pregunta<textarea value={text} onChange={(e) => setText(e.target.value)} required /></label>
            <label>Categoría<select value={category} onChange={(e) => setCategory(e.target.value as Category)}><option value="baseball">Béisbol</option><option value="general">Cultura general</option><option value="marca">Marca</option></select></label>
            <label>Marca<div className={styles.inputWrap}><Tag /><input value={brand} onChange={(e) => setBrand(e.target.value)} disabled={category !== "marca"} /></div></label>

            {answers.map((answer, index) => (
              <label key={index}>Respuesta {String.fromCharCode(65 + index)}
                <input value={answer} onChange={(e) => setAnswers((current) => current.map((item, itemIndex) => itemIndex === index ? e.target.value : item))} required />
              </label>
            ))}

            <label>Respuesta correcta<select value={correctAnswer} onChange={(e) => setCorrectAnswer(Number(e.target.value))}><option value={0}>A</option><option value={1}>B</option><option value={2}>C</option></select></label>
            <button type="submit"><Save />Guardar pregunta</button>
          </form>
        </section>

        <section className={styles.card}>
          <div className={styles.listHeading}><span>Banco de preguntas</span><h2>{questions.length} preguntas</h2></div>
          <div className={styles.list}>
            {questions.map((question) => (
              <article key={question.id}>
                <div className={styles.questionTop}><div><span>{question.category}</span>{question.brand && <b>{question.brand}</b>}</div><button type="button" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}><Trash2 /></button></div>
                <h3>{question.text}</h3>
                <div className={styles.answers}>
                  {question.answers.map((answer, index) => (
                    <div key={answer} className={index === question.correctAnswer ? styles.correct : ""}>{index === question.correctAnswer && <CheckCircle2 />}{answer}</div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
