// Contenido de las lecciones: separado del motor de navegación y validación.
export const lessons = [
  {
    id: 'select', title: 'SELECT básico', subtitle: 'Elige qué quieres ver', icon: '▤',
    steps: [
      { type: 'teoria', title: 'Tu primera consulta', text: 'SELECT elige columnas. FROM indica la tabla de donde salen.', code: 'SELECT titulo, anio\nFROM peliculas;' },
      { type: 'quiz', title: 'Elige la tabla', question: '¿Qué palabra indica de qué tabla leer los datos?', options: ['WHERE', 'FROM', 'ORDER BY'], answer: 1 },
      { type: 'reto', title: 'Explora el catálogo', prompt: 'Muestra el título y el género de todas las películas.', query: 'SELECT titulo, genero FROM peliculas;', hint: 'Elige las dos columnas con SELECT y consulta la tabla peliculas con FROM.', orderMatters: false },
    ]
  },
  {
    id: 'where', title: 'WHERE', subtitle: 'Encuentra lo que buscas', icon: '⌕',
    steps: [
      { type: 'teoria', title: 'Filtra filas', text: 'WHERE conserva solo las filas que cumplen una condición.', code: "SELECT titulo\nFROM peliculas\nWHERE genero = 'Ciencia ficción';" },
      { type: 'quiz', title: 'Una condición', question: '¿Qué operador significa «mayor que»?', options: ['>=', '<>', '>'], answer: 2 },
      { type: 'reto', title: 'Busca las más recientes', prompt: 'Muestra títulos y años de las películas estrenadas desde 2010.', query: 'SELECT titulo, anio FROM peliculas WHERE anio >= 2010;', hint: 'Compara la columna anio con 2010 usando >=.', orderMatters: false },
    ]
  },
  {
    id: 'order', title: 'ORDER BY', subtitle: 'Pon los datos en orden', icon: '↕',
    steps: [
      { type: 'teoria', title: 'Ordena resultados', text: 'ORDER BY ordena las filas. ASC sube; DESC baja.', code: 'SELECT titulo, anio\nFROM peliculas\nORDER BY anio DESC;' },
      { type: 'quiz', title: 'Del más nuevo al más viejo', question: '¿Qué dirección debes usar para ordenar años de mayor a menor?', options: ['ASC', 'DESC', 'GROUP'], answer: 1 },
      { type: 'reto', title: 'Las más taquilleras', prompt: 'Muestra título y recaudación, ordenados de mayor a menor recaudación.', query: 'SELECT titulo, recaudacion FROM peliculas ORDER BY recaudacion DESC;', hint: 'Ordena por recaudacion y usa DESC al final.', orderMatters: true },
    ]
  },
  {
    id: 'aggregate', title: 'Funciones de agregado', subtitle: 'Resume muchas filas', icon: '∑',
    steps: [
      { type: 'teoria', title: 'Una fila de resumen', text: 'COUNT cuenta filas; SUM suma valores; AVG calcula el promedio.', code: 'SELECT COUNT(*) AS total\nFROM peliculas;' },
      { type: 'quiz', title: 'Cuenta las películas', question: '¿Qué función cuenta las filas de una tabla?', options: ['SUM(*)', 'COUNT(*)', 'ORDER(*)'], answer: 1 },
      { type: 'reto', title: 'Mide el catálogo', prompt: 'Devuelve el número total de películas y llámalo total.', query: 'SELECT COUNT(*) AS total FROM peliculas;', hint: 'Usa COUNT(*) y pon el nombre total con AS.', orderMatters: true },
    ]
  },
  {
    id: 'group', title: 'GROUP BY', subtitle: 'Compara categorías', icon: '▦',
    steps: [
      { type: 'teoria', title: 'Resume por grupo', text: 'GROUP BY reúne filas con el mismo valor para resumir cada grupo.', code: 'SELECT genero, COUNT(*) AS total\nFROM peliculas\nGROUP BY genero;' },
      { type: 'quiz', title: 'Una fila por género', question: '¿Qué cláusula crea un resumen para cada género?', options: ['GROUP BY genero', 'ORDER BY genero', 'WHERE genero'], answer: 0 },
      { type: 'reto', title: 'Cuenta por género', prompt: 'Muestra cada género y cuántas películas tiene. Usa la columna total.', query: 'SELECT genero, COUNT(*) AS total FROM peliculas GROUP BY genero;', hint: 'Selecciona genero y COUNT(*), y agrupa por genero.', orderMatters: false },
    ]
  },
  {
    id: 'join', title: 'JOIN', subtitle: 'Conecta dos tablas', icon: '⛓',
    steps: [
      { type: 'teoria', title: 'Une información', text: 'JOIN combina tablas relacionadas. ON explica qué columnas coinciden.', code: 'SELECT peliculas.titulo, directores.pais\nFROM peliculas\nJOIN directores ON peliculas.director = directores.nombre;' },
      { type: 'quiz', title: 'La relación correcta', question: '¿Qué columnas conectan estas dos tablas?', options: ['peliculas.anio = directores.pais', 'peliculas.director = directores.nombre', 'peliculas.genero = directores.nombre'], answer: 1 },
      { type: 'reto', title: 'Conoce a cada director', prompt: 'Muestra el título de cada película y el país de su director.', query: 'SELECT peliculas.titulo, directores.pais FROM peliculas JOIN directores ON peliculas.director = directores.nombre;', hint: 'Une por peliculas.director = directores.nombre y elige titulo y pais.', orderMatters: false },
    ]
  },
];
