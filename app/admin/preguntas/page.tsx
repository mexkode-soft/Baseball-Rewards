"use client";
import { CheckCircle2, Plus, Save, Tag, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import styles from "./Preguntas.module.css";
import { createQuestion, deleteQuestion, readQuestions, type QuestionCategory, type TriviaQuestion } from "@/lib/questions";

export default function Page() {
  const [questions,setQuestions]=useState<TriviaQuestion[]>([]);
  const [text,setText]=useState(""); const [category,setCategory]=useState<QuestionCategory>("baseball");
  const [brand,setBrand]=useState(""); const [answers,setAnswers]=useState(["","",""]); const [correctAnswer,setCorrectAnswer]=useState(0);
  const [notice,setNotice]=useState("");

  async function load(){try{setQuestions(await readQuestions(true));}catch(error){setNotice(error instanceof Error?error.message:"No se pudieron cargar las preguntas.");}}
  useEffect(()=>{void load();},[]);

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!text.trim()||answers.some(a=>!a.trim()))return;
    try{
      await createQuestion({text:text.trim(),category,brand:category==="marca"?brand.trim():undefined,answers:[answers[0],answers[1],answers[2]],correctAnswer,active:true});
      setText("");setBrand("");setAnswers(["","",""]);setCorrectAnswer(0);setNotice("Pregunta guardada en Supabase.");await load();
    }catch(error){setNotice(error instanceof Error?error.message:"No se pudo guardar.");}
  }

  async function remove(id:string){try{await deleteQuestion(id);await load();}catch(error){setNotice(error instanceof Error?error.message:"No se pudo eliminar.");}}

  return <><div className={styles.pageTitle}><span>Home Run Rewards</span><h1>Listado de preguntas</h1><p>Administra el banco que alimenta las campañas de mapa y las colaboraciones de marca.</p></div>
  {notice&&<p>{notice}</p>}
  <div className={styles.layout}><section className={styles.card}><div className={styles.heading}><Plus/><div><span>Nueva pregunta</span><h2>Configuración</h2></div></div>
  <form className={styles.form} onSubmit={save}><label>Pregunta<textarea value={text} onChange={e=>setText(e.target.value)} required/></label>
  <label>Categoría<select value={category} onChange={e=>setCategory(e.target.value as QuestionCategory)}><option value="baseball">Béisbol</option><option value="general">Cultura general</option><option value="marca">Marca</option></select></label>
  <label>Marca<div className={styles.inputWrap}><Tag/><input value={brand} onChange={e=>setBrand(e.target.value)} disabled={category!=="marca"} placeholder="Ej. Burger King"/></div></label>
  {answers.map((answer,index)=><label key={index}>Respuesta {String.fromCharCode(65+index)}<input value={answer} onChange={e=>setAnswers(current=>current.map((item,i)=>i===index?e.target.value:item))} required/></label>)}
  <label>Respuesta correcta<select value={correctAnswer} onChange={e=>setCorrectAnswer(Number(e.target.value))}><option value={0}>A</option><option value={1}>B</option><option value={2}>C</option></select></label><button type="submit"><Save/>Guardar pregunta</button></form></section>
  <section className={styles.card}><div className={styles.listHeading}><span>Banco de preguntas</span><h2>{questions.length} preguntas</h2></div><div className={styles.list}>{questions.map(q=><article key={q.id}><div className={styles.questionTop}><div><span>{q.category}</span>{q.brand&&<b>{q.brand}</b>}</div><button type="button" onClick={()=>void remove(q.id)}><Trash2/></button></div><h3>{q.text}</h3><div className={styles.answers}>{q.answers.map((answer,index)=><div key={`${q.id}-${index}`} className={index===q.correctAnswer?styles.correct:""}>{index===q.correctAnswer&&<CheckCircle2/>}{answer}</div>)}</div></article>)}</div></section></div></>;
}
