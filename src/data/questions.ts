import type { Question } from '../types';

export const QUESTIONS: Question[] = [
  // ==========================================
  // FRONTEND (REACT, ANGULAR, VUE, CORE)
  // ==========================================
  {
    id: 'q-fe-1',
    directionId: 'frontend',
    subTrackId: 'core',
    title: 'Event Loop в JavaScript: микро- и макрозадачи',
    question: 'В каком порядке выполнятся console.log в данном коде и почему?',
    category: 'JavaScript Core',
    difficulty: 'Junior',
    answer: 'Сначала выполняется синхронный код (выведет 1 и 4). Затем Call Stack освобождается, и движок опустошает очередь МИКРОЗАДАЧ (Microtasks Queue): выполняются колбэки промисов (выведет 3). И только после этого движок переходит к очереди МАКРОЗАДАЧ (Macrotasks Queue / Task Queue): выполняется setTimeout (выведет 2). Итог: 1, 4, 3, 2.',
    codeSnippet: `console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);`,
    codeLanguage: 'javascript',
    keyTakeaways: [
      'Call Stack всегда выполняется до конца синхронно',
      'Микрозадачи (Promise, queueMicrotask) имеют приоритет над макрозадачами (setTimeout, setInterval, setImmediate)',
      'Очередь микрозадач вычищается полностью между макрозадачами',
    ],
  },
  {
    id: 'q-fe-2',
    directionId: 'frontend',
    subTrackId: 'core',
    title: 'Замыкание (Closure) и классическая проблема цикла с var',
    question: 'Что выведет данный цикл и как исправить проблему двумя способами?',
    category: 'JavaScript Core',
    difficulty: 'Junior',
    answer: 'Выведет три раза число 3 с задержкой в 100 мс! Переменная var имеет функциональную область видимости, поэтому создается одна переменная i на весь цикл. К моменту срабатывания таймеров цикл уже завершился и i равно 3. Исправление 1: заменить var на let (блочная область видимости, для каждой итерации создается отдельная переменная). Исправление 2: создать функцию-обертку (IIFE) или передать i аргументом.',
    codeSnippet: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Решение с let:
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 0, 1, 2
}`,
    codeLanguage: 'javascript',
    keyTakeaways: [
      'Замыкание — это комбинация функции и лексического окружения, в котором она объявлена',
      'let создает новую привязку переменной для каждой итерации цикла',
      'var не имеет блочной видимости и «всплывает» (hoisting)',
    ],
  },
  {
    id: 'q-fe-3',
    directionId: 'frontend',
    subTrackId: 'core',
    title: 'Разница между type и interface в TypeScript',
    question: 'В чем ключевые различия между type и interface в TypeScript и когда что предпочесть?',
    category: 'TypeScript',
    difficulty: 'Junior',
    answer: 'interface предназначен исключительно для описания формы объектов и классов. Он поддерживает автоматическое слияние объявлений (Declaration Merging). type — это псевдоним типа, который может описывать не только объекты, но и примитивы, union/intersection типы, кортежи. type не может быть повторно объявлен с тем же именем.',
    codeSnippet: `// Declaration merging (работает только с interface):
interface User { name: string; }
interface User { age: number; }
// Результирующий User имеет и name, и age

// Union типы (доступны только через type):
type Status = 'pending' | 'success' | 'failed';
type ID = string | number;`,
    codeLanguage: 'typescript',
    keyTakeaways: [
      'Для публичных API и библиотек часто выбирают interface из-за declaration merging',
      'Для сложных типов, объединений (unions), кортежей и утилит используют type',
    ],
  },
  {
    id: 'q-fe-4',
    directionId: 'frontend',
    subTrackId: 'react',
    title: 'Как работает Virtual DOM и зачем нужны key в списках React',
    question: 'Как React обновляет интерфейс и почему нельзя передавать индекс массива в качестве key?',
    category: 'React Core',
    difficulty: 'Junior',
    answer: 'Virtual DOM — это легковесное представление реального DOM в виде дерева JS-объектов. При изменении состояния React строит новое виртуальное дерево, сравнивает его со старым (Reconciliation / Diffing) и точечно вносит минимальные изменения в реальный DOM. Свойство key служит уникальным идентификатором элемента между рендерами. Если использовать индекс массива, то при удалении или вставке в начало все последующие элементы изменят свои индексы, что приведет к лишним перерисовкам и сбою внутреннего состояния дочерних компонентов.',
    codeSnippet: `// ПЛОХО:
{items.map((item, index) => <TodoItem key={index} todo={item} />)}

// ХОРОШО:
{items.map(item => <TodoItem key={item.id} todo={item} />)}`,
    codeLanguage: 'tsx',
    keyTakeaways: [
      'key должен быть стабильным, уникальным среди соседей и постоянным между рендерами',
      'Индекс массива допустим только для строго статичных неизменяемых списков',
    ],
  },
  {
    id: 'q-fe-5',
    directionId: 'frontend',
    subTrackId: 'react',
    title: 'Хуки useCallback и useMemo: когда они действительно нужны?',
    question: 'Какую проблему решают useCallback и useMemo и почему оборачивать всё подряд вредно?',
    category: 'React Optimization',
    difficulty: 'Junior+',
    answer: 'useMemo кэширует результат дорогого вычисления, а useCallback кэширует ссылку на саму функцию между рендерами. В JS функции и объекты пересоздаются при каждом рендере (новая ссылка). useCallback полезен, когда функция передается в оптимизированный дочерний компонент, обернутый в React.memo, либо используется в массиве зависимостей другого хука (useEffect). Оборачивать всё подряд нельзя: сами хуки требуют памяти и накладных расходов на создание массива зависимостей и их проверку при каждом рендере.',
    codeSnippet: `// Тяжелое вычисление
const filteredList = useMemo(() => {
  return items.filter(i => expensiveCheck(i, filter));
}, [items, filter]);

// Стабильная ссылка на колбэк для оптимизированной кнопки
const handleClick = useCallback(() => {
  console.log('Clicked', id);
}, [id]);`,
    codeLanguage: 'tsx',
    keyTakeaways: [
      'useMemo — для вычислений, useCallback — для ссылочной стабильности функций',
      'Имеет смысл только в связке с React.memo или зависимостями useEffect',
    ],
  },
  {
    id: 'q-fe-6',
    directionId: 'frontend',
    subTrackId: 'react',
    title: 'Правила хуков (Rules of Hooks) и useEffect cleanup',
    question: 'Почему хуки нельзя вызывать в условиях и циклах, и зачем возвращать функцию из useEffect?',
    category: 'React Hooks',
    difficulty: 'Junior',
    answer: 'React хранит состояния хуков в связанном списке внутри Fiber-узла компонента. Позиция вызова каждого хука должна строго совпадать между рендерами. Если вызвать хук внутри if, порядок вызова нарушится и стейты перепутаются. Функция, возвращаемая из useEffect, называется Cleanup-функцией. Она вызывается перед повторным запуском эффекта и при размонтировании компонента для отписки от сокетов/событий или отмены таймеров.',
    codeSnippet: `useEffect(() => {
  const handler = (e: MouseEvent) => console.log(e.clientX);
  window.addEventListener('mousemove', handler);

  // Функция очистки (cleanup) предотвращает утечки памяти
  return () => {
    window.removeEventListener('mousemove', handler);
  };
}, []);`,
    codeLanguage: 'tsx',
    keyTakeaways: [
      'Хуки вызываются только на верхнем уровне функционального компонента',
      'Cleanup функция предотвращает утечки памяти (таймеры, слушатели, сокеты)',
    ],
  },
  {
    id: 'q-fe-7',
    directionId: 'frontend',
    subTrackId: 'angular',
    title: 'Standalone компоненты и новый синтаксис шаблонов в Angular',
    question: 'Что такое Standalone Components в Angular и как изменился синтаксис шаблонов (@if, @for)?',
    category: 'Angular Core',
    difficulty: 'Junior',
    answer: 'Standalone Components устранили необходимость объявлять компоненты в NgModule. Компонент сам объявляет свои зависимости в поле imports декоратора @Component({ standalone: true, imports: [CommonModule, OtherComponent] }). Начиная с Angular 17 представлен новый встроенный control flow синтаксис: @if, @else, @for (item of items; track item.id), @empty, который работает значительно быстрее традиционных директив *ngIf и *ngFor.',
    codeSnippet: `@Component({
  selector: 'app-users',
  standalone: true,
  template: \`
    @if (isLoading()) {
      <p>Загрузка данных...</p>
    } @else {
      @for (user of users(); track user.id) {
        <div>{{ user.name }}</div>
      } @empty {
        <p>Список пуст</p>
      }
    }
  \`
})
export class UsersComponent {}`,
    codeLanguage: 'typescript',
    keyTakeaways: [
      'Standalone компоненты упрощают структуру проекта и lazy loading',
      '@for требует явного указания параметра track для эффективного отслеживания',
    ],
  },
  {
    id: 'q-fe-8',
    directionId: 'frontend',
    subTrackId: 'angular',
    title: 'RxJS операторы: разница между switchMap, mergeMap и concatMap',
    question: 'В чем разница между высшими операторами отображения switchMap, mergeMap и concatMap?',
    category: 'RxJS & Angular',
    difficulty: 'Junior+',
    answer: 'Все три оператора принимают значение из внешнего потока и возвращают внутренний Observable: 1) switchMap: отменяет предыдущий незавершенный внутренний запрос при поступлении нового значения (идеально для поиска и автокомплита); 2) mergeMap: обрабатывает все запросы параллельно, порядок ответов не гарантирован; 3) concatMap: выполняет запросы строго по очереди (последовательно), дожидаясь завершения предыдущего.',
    codeSnippet: `// Идеально для живого поиска:
searchControl.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query => this.apiService.search(query))
).subscribe(results => this.results = results);`,
    codeLanguage: 'typescript',
    keyTakeaways: [
      'switchMap — автокомплит, поиск, переключение вкладок',
      'mergeMap — параллельная независимая загрузка',
      'concatMap — строгая очередность (транзакции, сохранение шагов)',
    ],
  },
  {
    id: 'q-fe-9',
    directionId: 'frontend',
    subTrackId: 'vue',
    title: 'Vue 3: разница между ref() и reactive()',
    question: 'Как работают ref() и reactive() в Vue 3 Composition API и в чем их отличия?',
    category: 'Vue 3 Core',
    difficulty: 'Junior',
    answer: 'ref() оборачивает любое значение (примитив, объект, массив) в объект с единственным реактивным свойством .value. В шаблоне .value разворачивается автоматически. reactive() принимает только объект/массив и делает его глубоко реактивным с помощью JavaScript Proxy. Ключевое отличие: reactive нельзя переприсвоить целиком и нельзя деструктурировать без потери реактивности (нужен toRefs), поэтому сейчас в Vue 3 стандартом де-факто является повсеместное использование ref().',
    codeSnippet: `import { ref, reactive, toRefs } from 'vue';

// ref работает и для примитивов, и для объектов
const count = ref(0);
count.value++;

// reactive только для объектов
const state = reactive({ name: 'Тимур', age: 24 });
// state = reactive(...) ПРИВЕДЕТ К ПОТЕРЕ РЕАКТИВНОСТИ!`,
    codeLanguage: 'typescript',
    keyTakeaways: [
      'В Vue 3 рекомендуется преимущественно использовать ref для предсказуемости',
      'Деструктуризация reactive теряет реактивность, используйте toRefs()',
    ],
  },

  // ==========================================
  // BACKEND (PYTHON, GO, JAVA, NODEJS, SQL)
  // ==========================================
  {
    id: 'q-be-1',
    directionId: 'backend',
    subTrackId: 'core',
    title: 'Идемпотентность HTTP методов и статус-коды',
    question: 'Что такое идемпотентность метода и чем отличаются PUT, POST и PATCH?',
    category: 'REST API',
    difficulty: 'Junior',
    answer: 'Метод считается идемпотентным, если повторный вызов с теми же параметрами приводит к тому же состоянию сервера, что и одиночный вызов (GET, PUT, DELETE — идемпотентны; POST — НЕ идемпотентен, так как многократная отправка создаст несколько новых записей). Разница между методами: POST создает новый ресурс, PUT полностью заменяет ресурс (или создает, если его нет), PATCH вносит частичное изменение в существующий ресурс.',
    codeSnippet: `POST /api/articles/        -> Создать новую статью (генерируется ID)
PUT /api/articles/42       -> Полная замена полей статьи #42
PATCH /api/articles/42     -> Частичное обновление (например только { "title": "New" })
DELETE /api/articles/42    -> Удаление статьи (повторный запрос вернет 404/204, ресурс удален)`,
    codeLanguage: 'http',
    keyTakeaways: [
      'GET, HEAD, OPTIONS, PUT, DELETE — идемпотентны',
      'POST и PATCH (в некоторых сценариях) — не гарантируют идемпотентность',
      '201 Created для успешного создания, 204 No Content для удаления/обновления без тела',
    ],
  },
  {
    id: 'q-be-2',
    directionId: 'backend',
    subTrackId: 'core',
    title: 'Транзакции и принципы ACID в реляционных БД',
    question: 'Что означают буквы в аббревиатуре ACID и какие аномалии решают уровни изоляции?',
    category: 'Databases & SQL',
    difficulty: 'Junior',
    answer: 'A (Atomicity, Атомарность): транзакция выполняется целиком либо не выполняется вовсе (rollback). C (Consistency, Согласованность): перевод БД из одного валидного состояния в другое с соблюдением всех ограничений (constraints). I (Isolation, Изолированность): параллельные транзакции не должны влиять друг на друга. D (Durability, Долговечность): если транзакция зафиксирована (commit), изменения сохранятся даже при сбое питания. Уровни изоляции: Read Uncommitted, Read Committed (дефолт в PostgreSQL), Repeatable Read, Serializable.',
    codeSnippet: `BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE id = 2;
-- Если на любом этапе произойдет сбой:
-- ROLLBACK;
COMMIT;`,
    codeLanguage: 'sql',
    keyTakeaways: [
      'Read Committed защищает от грязного чтения (Dirty Read)',
      'Repeatable Read защищает от неповторяющегося чтения (Non-repeatable Read)',
      'Serializable защищает от всех аномалий, включая фантомные строки (Phantom Read)',
    ],
  },
  {
    id: 'q-be-3',
    directionId: 'backend',
    subTrackId: 'core',
    title: 'Индексы B-Tree в PostgreSQL и когда индекс НЕ сработает',
    question: 'Как устроен индекс B-Tree и в каких случаях PostgreSQL откажется его использовать?',
    category: 'PostgreSQL',
    difficulty: 'Junior+',
    answer: 'B-Tree (сбалансированное дерево) хранит данные в отсортированном виде, позволяя выполнять поиск за O(log n). Индекс НЕ будет использован, если: 1) Столбец обернут в функцию, например WHERE LOWER(email) = "x" (нужен functional index); 2) Поиск по шаблону с процентом в начале: LIKE "%abc"; 3) Несовпадение типов данных (неявный каст); 4) Таблица слишком мала (планировщику дешевле сделать Sequential Scan); 5) В составном индексе (a, b) запрос фильтрует только по b, игнорируя первый столбец.',
    codeSnippet: `-- Не использует обычный индекс по email:
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- Решение: функциональный индекс
CREATE INDEX idx_users_lower_email ON users (LOWER(email));`,
    codeLanguage: 'sql',
    keyTakeaways: [
      'Используйте EXPLAIN ANALYZE для проверки плана выполнения запроса',
      'Составной индекс (col1, col2) работает только если фильтрация начинается с col1',
    ],
  },
  {
    id: 'q-be-4',
    directionId: 'backend',
    subTrackId: 'python',
    title: 'Python: GIL (Global Interpreter Lock) и его влияние на потоки',
    question: 'Что такое GIL в CPython, почему он существует и как писать параллельный код?',
    category: 'Python Core',
    difficulty: 'Junior+',
    answer: 'GIL — это мьютекс, который не позволяет нескольким нативным потокам одновременно выполнять байткод Python в рамках одного процесса. Он был внедрен для безопасного управления памятью и механизма подсчета ссылок (Reference Counting). Для I/O-bound задач (сеть, диск, запросы к БД) потоки threading и asyncio отлично работают, так как при ожидании ввода-вывода GIL отпускается. Для тяжелых вычислений (CPU-bound: ML, обработка изображений) нужно использовать модуль multiprocessing или выносить логику в C/Rust расширения.',
    codeSnippet: `import asyncio
import multiprocessing

# Для I/O-bound (сеть, API, БД):
async def fetch_data():
    async with aiohttp.ClientSession() as session:
        ...

# Для CPU-bound (математика, сжатие):
def cpu_heavy_task(data):
    return sum(x**2 for x in data)

# Запуск в отдельном процессе в обход GIL:
# with multiprocessing.Pool() as pool:
#     pool.map(cpu_heavy_task, chunks)`,
    codeLanguage: 'python',
    keyTakeaways: [
      'GIL ограничивает параллельное выполнение CPU-bound кода на нескольких ядрах',
      'I/O-bound задачи масштабируются через asyncio или threading',
      'CPU-bound задачи масштабируются через multiprocessing или Celery воркеры',
    ],
  },
  {
    id: 'q-be-5',
    directionId: 'backend',
    subTrackId: 'python',
    title: 'FastAPI: валидация Pydantic v2 и Dependency Injection',
    question: 'Как устроен механизм Depends в FastAPI и в чем преимущества Pydantic?',
    category: 'FastAPI',
    difficulty: 'Junior',
    answer: 'Depends в FastAPI реализует паттерн Dependency Injection (внедрение зависимостей). Он позволяет выносить повторяющуюся логику (подключение к БД, проверку JWT токена, пагинацию, права доступа) в отдельные функции. FastAPI сам разрешает граф зависимостей, кэширует результаты в рамках одного запроса и закрывает генераторы (yield). Pydantic v2 написан на Rust (pydantic-core), что обеспечивает молниеносную валидацию типов и автогенерацию схемы OpenAPI/Swagger.',
    codeSnippet: `from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, EmailStr

app = FastAPI()

class UserCreate(BaseModel):
    email: EmailStr
    age: int

async def get_current_user(token: str = Header(...)):
    user = verify_jwt(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

@app.post("/items")
async def create_item(payload: UserCreate, user = Depends(get_current_user)):
    return {"status": "ok", "owner": user.id}`,
    codeLanguage: 'python',
    keyTakeaways: [
      'Depends с yield работает как контекстный менеджер (автоматический commit/close соединения)',
      'Pydantic обеспечивает строгую валидацию входных и выходных данных',
    ],
  },
  {
    id: 'q-be-6',
    directionId: 'backend',
    subTrackId: 'golang',
    title: 'Устройство slice в Go: ptr, len, cap и поведение append()',
    question: 'Из чего состоит заголовок slice в Go и почему передача slice в функцию может удивить?',
    category: 'Golang Core',
    difficulty: 'Junior',
    answer: 'Под капотом slice — это структура из трех полей: 1) указатель на массив данных (Data unsafe.Pointer), 2) длина (len int), 3) вместимость (cap int). При передаче в функцию заголовок копируется по значению. Если внутри функции изменить элемент по индексу s[0] = 99, изменение увидит и вызывающий код, так как указатель смотрит на тот же массив. Но если вызвать append(), превышающий cap, выделится новый базовый массив, указатель обновится локально, и внешний срез не изменит ни длину, ни новые элементы.',
    codeSnippet: `func modify(s []int) {
    s[0] = 999       // Изменение видно снаружи!
    s = append(s, 42) // Изменение len и возможно реаллокация — НЕ видны снаружи!
}

func main() {
    a := []int{1, 2, 3}
    modify(a)
    fmt.Println(a) // Выведет [999, 2, 3]
}`,
    codeLanguage: 'go',
    keyTakeaways: [
      'Срез передается по значению заголовка (структура из 24 байт на 64-бит системе)',
      'Если нужно менять len из функции, передавайте указатель на срез *[]T или возвращайте новый срез',
    ],
  },
  {
    id: 'q-be-7',
    directionId: 'backend',
    subTrackId: 'golang',
    title: 'Каналы в Go: закрытие, буферизация и чтение из закрытого канала',
    question: 'Что произойдет при записи в закрытый канал, чтении из закрытого канала и повторном закрытии?',
    category: 'Golang Concurrency',
    difficulty: 'Junior',
    answer: '1) Запись в закрытый канал: немедленная паника (panic: send on closed channel); 2) Повторное закрытие закрытого канала: паника (panic: close of closed channel); 3) Чтение из закрытого канала: НЕ паникует! Сначала вычитываются оставшиеся буферизованные значения, а после их исчерпания возвращается дефолтное нулевое значение типа и флаг false: val, ok := <-ch (если ok == false — канал пуст и закрыт). 4) Запись или чтение из nil-канала блокируют горутину навсегда (deadlock).',
    codeSnippet: `ch := make(chan int, 2)
ch <- 10
close(ch)

val, ok := <-ch // val = 10, ok = true
val, ok = <-ch  // val = 0 (нулевое значение), ok = false`,
    codeLanguage: 'go',
    keyTakeaways: [
      'Канал всегда должен закрывать только отправляющий (sender)',
      'Конструкция for val := range ch автоматически останавливается при закрытии канала',
    ],
  },
  {
    id: 'q-be-8',
    directionId: 'backend',
    subTrackId: 'java',
    title: 'Устройство HashMap в Java: коллизии, бакеты и красно-черные деревья',
    question: 'Как HashMap в Java разрешает коллизии и почему важен контракт equals() и hashCode()?',
    category: 'Java Core',
    difficulty: 'Junior+',
    answer: 'HashMap основан на массиве бакетов (Node[] table). Индекс вычисляется по хешу ключа. При коллизии (разные ключи попадают в один бакет) элементы организуются в связный список. Начиная с Java 8, если количество элементов в одном бакете превышает порог TREEIFY_THRESHOLD (8 элементов) и общая емкость таблицы не менее 64, список преобразуется в сбалансированное красно-черное дерево (TreeNode), что улучшает поиск с O(n) до O(log n). Если переопределить equals(), но забыть hashCode(), два логически одинаковых объекта попадут в разные бакеты и метод map.get(key) вернет null!',
    codeSnippet: `// Контракт:
// Если a.equals(b) == true, то a.hashCode() ОБЯЗАН быть равен b.hashCode()!
// Если hashCode() одинаковый, объекты не обязательно равны (это коллизия).`,
    codeLanguage: 'java',
    keyTakeaways: [
      'Дефолтный load factor равен 0.75 (баланс между временем поиска и памятью)',
      'Неизменяемые ключи (например, String или Record) защищают от изменения хэша во время нахождения в Map',
    ],
  },
  {
    id: 'q-be-9',
    directionId: 'backend',
    subTrackId: 'nodejs',
    title: 'Архитектура Node.js: Event Loop в libuv и фазы выполнения',
    question: 'Какие основные фазы есть у Event Loop в Node.js и чем process.nextTick отличается от setImmediate?',
    category: 'Node.js',
    difficulty: 'Junior+',
    answer: 'Event Loop в Node.js обеспечивается библиотекой libuv и включает ключевые фазы: 1) timers (выполнение setTimeout и setInterval); 2) pending callbacks (системные I/O ошибки); 3) idle, prepare; 4) poll (получение новых I/O событий, чтение сокетов и файлов); 5) check (выполнение setImmediate); 6) close callbacks. process.nextTick не является частью самого цикла libuv: его очередь обрабатывается сразу после текущей операции, ДО перехода к следующей фазе Event Loop!',
    codeSnippet: `setImmediate(() => console.log('check: setImmediate'));
process.nextTick(() => console.log('nextTick: выполняется первым!'));
Promise.resolve().then(() => console.log('microtask: Promise'));`,
    codeLanguage: 'javascript',
    keyTakeaways: [
      'process.nextTick имеет наивысший приоритет и может заблокировать I/O при рекурсивном вызове',
      'setImmediate выполняется в фазе check сразу после фазы poll',
    ],
  },

  // ==========================================
  // MOBILE (ANDROID, IOS, FLUTTER)
  // ==========================================
  {
    id: 'q-mob-1',
    directionId: 'mobile',
    subTrackId: 'android',
    title: 'Android: StateFlow vs SharedFlow в Kotlin Coroutines',
    question: 'В чем разница между StateFlow и SharedFlow и что выбрать для событий однократного показа (Toast / навигация)?',
    category: 'Android Kotlin',
    difficulty: 'Junior+',
    answer: 'StateFlow — это hot flow, предназначенный для хранения и эмита состояния UI. У него всегда есть текущее значение (value), он хранит последнее значение (replay = 1) и отфильтровывает дубликаты (conflated). SharedFlow — более общий hot flow для отправки потока событий (events). Для однократных событий навигации или снекбаров StateFlow плох тем, что при повторном подключении подписчика (например при перевороте экрана) старое значение отобразится снова. Для событий используют SharedFlow с replay = 0 или Channel.',
    codeSnippet: `// Состояние экрана (UI State):
private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
val uiState: StateFlow<UiState> = _uiState.asStateFlow()

// Однократные события (Эвенты навигации):
private val _events = MutableSharedFlow<UiEvent>(replay = 0)
val events: SharedFlow<UiEvent> = _events.asSharedFlow()`,
    codeLanguage: 'kotlin',
    keyTakeaways: [
      'StateFlow всегда требует начальное значение и имеет метод .value',
      'SharedFlow гибко настраивается по параметрам replay и extraBufferCapacity',
    ],
  },
  {
    id: 'q-mob-2',
    directionId: 'mobile',
    subTrackId: 'ios',
    title: 'iOS: Управление памятью ARC, strong/weak/unowned и Retain Cycle',
    question: 'Что такое Retain Cycle в Swift и как ключевые слова weak и unowned предотвращают утечки памяти?',
    category: 'iOS Swift',
    difficulty: 'Junior',
    answer: 'ARC (Automatic Reference Counting) автоматически освобождает память, когда счетчик сильных ссылок (strong) на экземпляр класса становится равен 0. Retain Cycle (циклическая ссылка) возникает, когда два объекта сильно ссылаются друг на друга, или когда замыкание захватывает self по сильной ссылке, а self удерживает это замыкание. weak создает слабую ссылку, не увеличивающую счетчик; при деаллокации объекта weak-ссылка автоматически становится nil (всегда Optional). unowned также не увеличивает счетчик, но ожидает, что объект никогда не станет nil (если объект уничтожен, обращение вызовет краш).',
    codeSnippet: `class NetworkManager {
    var onComplete: (() -> Void)?

    func load() {
        // Захват [weak self] предотвращает retain cycle:
        onComplete = { [weak self] in
            guard let self = self else { return }
            self.updateUI()
        }
    }
}`,
    codeLanguage: 'swift',
    keyTakeaways: [
      'weak всегда var и Optional (становятся nil автоматически)',
      'unowned используется только тогда, когда время жизни зависимого объекта строго меньше или равно основному',
    ],
  },
  {
    id: 'q-mob-3',
    directionId: 'mobile',
    subTrackId: 'flutter',
    title: 'Flutter: StatelessWidget vs StatefulWidget и метод build()',
    question: 'Чем отличаются StatelessWidget и StatefulWidget и почему метод build() должен быть чистой функцией?',
    category: 'Flutter Dart',
    difficulty: 'Junior',
    answer: 'StatelessWidget неизменяем: его свойства задаются при создании и не могут меняться со временем. StatefulWidget хранит изменяемое состояние в отдельном объекте State, переживающем пересоздание виджета. Метод setState() уведомляет фреймворк о необходимости запланировать повторный вызов build(). Метод build() может вызываться фреймворком многократно на каждом кадре анимации (до 120 раз в секунду), поэтому в нем категорически нельзя выполнять HTTP-запросы или тяжелые вычисления — он должен быть чистым и зависеть только от текущего состояния.',
    codeSnippet: `class CounterScreen extends StatefulWidget {
  @override
  State<CounterScreen> createState() => _CounterScreenState();
}

class _CounterScreenState extends State<CounterScreen> {
  int _counter = 0;

  void _increment() {
    setState(() { _counter++; });
  }

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(onPressed: _increment, child: Text('Count: $_counter'));
  }
}`,
    codeLanguage: 'dart',
    keyTakeaways: [
      'Инициализацию сетевых запросов делайте в initState(), а не в build()',
      'Для сложного состояния используют BLoC или Riverpod вместо раздутого setState',
    ],
  },

  // ==========================================
  // DATA SCIENCE, ML & ANALYTICS
  // ==========================================
  {
    id: 'q-ds-1',
    directionId: 'data_science',
    subTrackId: 'ml',
    title: 'Метрики классификации: Precision, Recall, F1-score и ROC-AUC',
    question: 'В чем разница между Precision и Recall, и какую метрику выбрать при диагностике опасных редких заболеваний?',
    category: 'Machine Learning',
    difficulty: 'Junior',
    answer: 'Precision (Точность) = TP / (TP + FP). Показывает, какая доля объектов, названных моделью положительными, действительно положительна. Recall (Полнота) = TP / (TP + FN). Показывает, какую долю реальных положительных объектов модель сумела обнаружить. При диагностике редких опасных заболеваний критически важен Recall (Полнота): лучше послать здорового человека на дополнительное обследование (False Positive), чем пропустить больного и не оказать ему помощь (False Negative)! F1-score — это гармоническое среднее между Precision и Recall.',
    codeSnippet: `from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score

# y_true = реальные метки [0, 1, 0, 1]
# y_pred = предсказания модели [0, 1, 0, 0]
rec = recall_score(y_true, y_pred)
prec = precision_score(y_true, y_pred)
f1 = f1_score(y_true, y_pred)`,
    codeLanguage: 'python',
    keyTakeaways: [
      'Recall минимизирует ложноотрицательные ошибки (FN)',
      'Precision минимизирует ложноположительные ошибки (FP)',
      'Accuracy неприменима при дисбалансе классов (например 99% нулей и 1% единиц)',
    ],
  },
  {
    id: 'q-ds-2',
    directionId: 'data_science',
    subTrackId: 'ml',
    title: 'Регуляризация в линейных моделях: L1 (Lasso) vs L2 (Ridge)',
    question: 'Как работают штрафы L1 и L2 и почему L1-регуляризация способна обнулять веса признаков?',
    category: 'Machine Learning',
    difficulty: 'Junior',
    answer: 'Регуляризация добавляет штраф за величину весов к функции потерь, предотвращая переобучение. L2 (Ridge) штрафует сумму квадратов весов: плавно уменьшает веса к нулю, но редко делает их строго нулевыми. L1 (Lasso) штрафует сумму абсолютных значений весов (|w|). Геометрически область допустимых значений L1 представляет собой ромб с острыми вершинами на координатных осях, поэтому изолинии функции потерь чаще всего касаются области именно в вершинах, где некоторые веса строго равны 0. Поэтому Lasso используется для автоматического отбора признаков (Feature Selection).',
    codeSnippet: `from sklearn.linear_model import Lasso, Ridge

# Lasso обнуляет неважные признаки:
lasso = Lasso(alpha=0.1)
lasso.fit(X_train, y_train)
zero_features_count = (lasso.coef_ == 0).sum()`,
    codeLanguage: 'python',
    keyTakeaways: [
      'L1 (Lasso) — зануляет веса (отбор признаков, разреженная модель)',
      'L2 (Ridge) — стягивает веса, устойчива к мультиколлинеарности',
      'ElasticNet объединяет штрафы L1 и L2',
    ],
  },
  {
    id: 'q-ds-3',
    directionId: 'data_science',
    subTrackId: 'analytics',
    title: 'A/B-тестирование: Ошибки первого и второго рода, p-value',
    question: 'Что такое p-value, уровень значимости alpha и мощность теста (1 - beta)?',
    category: 'Product Analytics',
    difficulty: 'Junior+',
    answer: 'p-value — это вероятность получить наблюдаемый (или более экстремальный) результат при условии, что нулевая гипотеза H0 верна (изменений нет). Ошибка I рода (alpha, ложная тревога): мы отклоняем верную нулевую гипотезу (обычно фиксируют на уровне 5%, p < 0.05). Ошибка II рода (beta, пропуск эффекта): мы не отклоняем неверную H0 (не заметили реальный рост метрики). Мощность теста (1 - beta) обычно устанавливают на уровне 80%. Нельзя останавливать тест раньше времени при первом достижении p < 0.05 (проблема подглядывания / peeking problem).',
    codeSnippet: `from scipy import stats

# Сравнение конверсий двух групп t-критерием
stat, p_val = stats.ttest_ind(group_a, group_b)
if p_val < 0.05:
    print("Статистически значимый результат!")`,
    codeLanguage: 'python',
    keyTakeaways: [
      'p-value НЕ равен вероятности того, что гипотеза верна',
      'Длительность теста и размер выборки должны фиксироваться ДО запуска теста',
    ],
  },
  {
    id: 'q-ds-4',
    directionId: 'data_science',
    subTrackId: 'core',
    title: 'Оконные функции в SQL: ROW_NUMBER, RANK, DENSE_RANK',
    question: 'В чем различие между оконными функциями ROW_NUMBER(), RANK() и DENSE_RANK()?',
    category: 'SQL Analytics',
    difficulty: 'Junior',
    answer: 'Все три функции нумеруют строки внутри партиции по заданному порядку. При одинаковых значениях столбца сортировки: ROW_NUMBER() всегда дает уникальный порядковый номер (1, 2, 3, 4); RANK() дает одинаковым значениям один и тот же ранг, но с пропусками следующих позиций (1, 2, 2, 4); DENSE_RANK() дает одинаковым строкам один ранг БЕЗ пропуска следующих номеров (1, 2, 2, 3).',
    codeSnippet: `SELECT 
  employee_id, department_id, salary,
  ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) as rn,
  RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) as rnk,
  DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) as drnk
FROM employees;`,
    codeLanguage: 'sql',
    keyTakeaways: [
      'PARTITION BY разбивает датасет на группы (окна), ORDER BY задает сортировку внутри окна',
      'Оконные функции выполняются после предложений WHERE, GROUP BY и HAVING',
    ],
  },

  // ==========================================
  // QA (ТЕСТИРОВАНИЕ)
  // ==========================================
  {
    id: 'q-qa-1',
    directionId: 'qa',
    subTrackId: 'core',
    title: 'Техники тест-дизайна: классы эквивалентности и граничные значения',
    question: 'Как применить классы эквивалентности и граничные значения для поля ввода пароля длиной от 8 до 16 символов?',
    category: 'QA Theory',
    difficulty: 'Junior',
    answer: 'Классы эквивалентности делят входные данные на группы, где программа ведет себя одинаково: 1) Невалидный: длина 0..7 символов; 2) Валидный: длина 8..16 символов; 3) Невалидный: длина 17+ символов. Граничные значения — это точки на стыке классов, где чаще всего случаются дефекты ("ошибка на единицу"). Для диапазона [8..16] проверяются граничные точки: 7 (граница невалидного), 8 (нижняя граница валидного), 9, 15, 16 (верхняя граница валидного), 17 (граница невалидного), а также крайние случаи: 0 (пустая строка) и огромная строка (255+ символов).',
    codeSnippet: `// Тестовые наборы по граничным значениям:
// 7 символов  -> Ошибка валидации
// 8 символов  -> Успех (нижняя граница)
// 16 символов -> Успех (верхняя граница)
// 17 символов -> Ошибка валидации`,
    codeLanguage: 'text',
    keyTakeaways: [
      'Граничные значения проверяют саму границу, границу минус 1 и границу плюс 1',
      'Техники тест-дизайна сокращают общее количество тестов без потери покрытия дефектов',
    ],
  },
  {
    id: 'q-qa-2',
    directionId: 'qa',
    subTrackId: 'core',
    title: 'Разница между Severity (Серьезность) и Priority (Приоритет)',
    question: 'В чем разница между Severity и Priority дефекта? Приведите пример бага с High Severity / Low Priority.',
    category: 'QA Theory',
    difficulty: 'Junior',
    answer: 'Severity (Серьезность) показывает степень технического влияния дефекта на работоспособность системы (определяется тестировщиком). Priority (Приоритет) показывает порядок и срочность исправления бага с точки зрения бизнеса (определяется Product Owner / Project Manager). Пример High Severity + Low Priority: приложение падает в краш (Fatal) при экспорте отчета за 2005 год в устаревшем браузере Internet Explorer 9 (система падает, но этим сценарием пользуются 0.001% клиентов). Пример Low Severity + High Priority: опечатка в названии бренда компании или логотипе на главной странице (система работает, но репутационный ущерб высок).',
    codeSnippet: `Severity: Blocker / Critical / Major / Minor / Trivial
Priority: Immediate / High / Medium / Low`,
    codeLanguage: 'text',
    keyTakeaways: [
      'Severity — техническая оценка ущерба функциональности',
      'Priority — бизнес-оценка скорости исправления бага',
    ],
  },
  {
    id: 'q-qa-3',
    directionId: 'qa',
    subTrackId: 'auto_qa',
    title: 'Паттерн Page Object Model (POM) в автоматизации UI',
    question: 'Зачем нужен паттерн Page Object Model и как он улучшает поддержку автотестов?',
    category: 'QA Automation',
    difficulty: 'Junior',
    answer: 'Page Object Model (POM) разделяет логику тестов и представление веб-страниц. Каждая страница (или ее крупный компонент) описывается отдельным классом, содержащим локаторы элементов и методы взаимодействия с ними (login, submit, search). Сам тест оперирует бизнес-действиями и не знает деталей верстки. Если верстальщик изменит id или class кнопки на странице, локатор придется изменить только в одном месте (в Page Object классе), а десятки тестов останутся нетронутыми.',
    codeSnippet: `# Класс страницы (Page Object)
class LoginPage:
    def __init__(self, page):
        self.page = page
        self.username_input = page.locator('#username')
        self.password_input = page.locator('#password')
        self.submit_btn = page.locator('button[type="submit"]')

    async def login(self, user, pwd):
        await self.username_input.fill(user)
        await self.password_input.fill(pwd)
        await self.submit_btn.click()

# Чистый автотест:
async def test_successful_login(page):
    login_page = LoginPage(page)
    await login_page.login("timur", "secret123")
    assert await page.is_visible('.dashboard')`,
    codeLanguage: 'python',
    keyTakeaways: [
      'Тесты не содержат прямых селекторов и CSS/XPath строк',
      'Упрощается масштабирование и переиспользование шагов тестирования',
    ],
  },

  // ==========================================
  // DEVOPS & CLOUD
  // ==========================================
  {
    id: 'q-dev-1',
    directionId: 'devops',
    subTrackId: 'cicd_docker',
    title: 'Docker: разница между инструкциями CMD и ENTRYPOINT',
    question: 'Чем отличаются инструкции CMD и ENTRYPOINT в Dockerfile и как они взаимодействуют?',
    category: 'Docker',
    difficulty: 'Junior',
    answer: 'ENTRYPOINT задает исполняемый файл или команду, которая запускается при старте контейнера по умолчанию (ее сложно переопределить из cli без флага --entrypoint). CMD задает аргументы по умолчанию для ENTRYPOINT либо дефолтную команду, если ENTRYPOINT не указан. Любые аргументы, переданные в docker run <image> <args>, полностью переопределяют CMD, но передаются как параметры в ENTRYPOINT. Лучшая практика — использовать exec форму в виде JSON-массива ["executable", "param"], чтобы процесс получил PID 1 и корректно ловил сигналы завершения SIGTERM.',
    codeSnippet: `# Правильный паттерн использования:
ENTRYPOINT ["python", "main.py"]
CMD ["--port", "8000"]

# Если запустить:
# docker run my-app
# -> Выполнится: python main.py --port 8000

# Если запустить:
# docker run my-app --port 9000
# -> Выполнится: python main.py --port 9000`,
    codeLanguage: 'dockerfile',
    keyTakeaways: [
      'Всегда используйте exec-синтаксис ["app"] вместо shell-синтаксиса app для корректной обработки сигналов остановки',
      'CMD служит для переопределяемых аргументов по умолчанию',
    ],
  },
  {
    id: 'q-dev-2',
    directionId: 'devops',
    subTrackId: 'cicd_docker',
    title: 'Многоэтапная сборка (Multi-stage builds) в Dockerfile',
    question: 'Какую проблему решают Multi-stage builds и как уменьшить размер итогового образа?',
    category: 'Docker Optimization',
    difficulty: 'Junior',
    answer: 'Multi-stage builds позволяют использовать несколько инструкций FROM в одном Dockerfile. Первый этап (builder) содержит полный набор инструментов разработки, компиляторы (Go, Rust, Node.js с devDependencies, gcc), исходники. В финальный этап берется минимальный базовый образ (alpine, distroless или scratch) и через COPY --from=builder копируется только скомпилированный бинарник или собранный фронтенд в dist. Это сокращает размер образа с сотен мегабайт до десятков, ускоряет скачивание по сети и резко снижает уязвимости безопасности (нет компиляторов и лишних утилит в проде).',
    codeSnippet: `# Этап 1: Сборка
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Этап 2: Финальный легковесный образ
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
    codeLanguage: 'dockerfile',
    keyTakeaways: [
      'COPY --from=<stage_name> переносит только готовые артефакты',
      'В продакшн образе отсутствуют секреты и dev-инструменты сборки',
    ],
  },
  {
    id: 'q-dev-3',
    directionId: 'devops',
    subTrackId: 'k8s_iac',
    title: 'Kubernetes: livenessProbe vs readinessProbe vs startupProbe',
    question: 'В чем разница между пробами livenessProbe и readinessProbe в Pod спецификации Kubernetes?',
    category: 'Kubernetes',
    difficulty: 'Junior+',
    answer: 'livenessProbe (проверка живучести) проверяет, работает ли приложение вообще (не завис ли процесс во взаимной блокировке deadlock). Если livenessProbe провалилась, Kubelet перезапускает контейнер (restartPolicy). readinessProbe (проверка готовности) проверяет, готов ли сервис принимать входящий трафик от клиентов (например, прогрелся ли кэш, установлено ли соединение с БД). Если readinessProbe не проходит, контейнер НЕ перезапускается, а временно исключается из эндпоинтов Service (трафик на него не идет, клиенты не получают ошибок 502/504). startupProbe отключает остальные пробы до полного завершения долгого старта приложения.',
    codeSnippet: `livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 20

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5`,
    codeLanguage: 'yaml',
    keyTakeaways: [
      'Сбой livenessProbe -> перезапуск контейнера',
      'Сбой readinessProbe -> отключение трафика от Service',
      'Не делайте тяжелые проверки БД в livenessProbe, иначе при сбое БД Kubernetes перезапустит все поды одновременно (каскадный сбой)',
    ],
  },
  {
    id: 'q-dev-4',
    directionId: 'devops',
    subTrackId: 'core',
    title: 'Nginx: Reverse Proxy, директива proxy_pass и слэш в конце URI',
    question: 'В чем разница между proxy_pass http://backend:8080 и proxy_pass http://backend:8080/ в Nginx?',
    category: 'Nginx',
    difficulty: 'Junior+',
    answer: 'Если в директиве proxy_pass URI НЕ указан (нет слэша в конце: proxy_pass http://backend:8080), Nginx передает запрос на бэкенд с исходным полным URI запроса. Если же в proxy_pass указан URI (хотя бы один слэш на конце: proxy_pass http://backend:8080/), то Nginx заменяет ту часть запроса, которая совпала с location, на URI из proxy_pass (происходит стриппинг префикса пути).',
    codeSnippet: `# Запрос: GET /api/v1/users

# Вариант 1 (без слэша):
location /api/ {
    proxy_pass http://backend:8080;
    # На бэкенд уйдет: GET /api/v1/users
}

# Вариант 2 (со слэшем):
location /api/ {
    proxy_pass http://backend:8080/;
    # На бэкенд уйдет: GET /v1/users (префикс /api/ удален!)
}`,
    codeLanguage: 'nginx',
    keyTakeaways: [
      'Слэш на конце proxy_pass меняет URI путь, отправляемый на проксируемый сервер',
      'Всегда проксируйте заголовки Host, X-Real-IP и X-Forwarded-For для сохранения данных клиента',
    ],
  },
  {
    "id": "q-fe-10",
    "directionId": "frontend",
    "subTrackId": "core",
    "title": "Debounce vs Throttle: применение в веб-интерфейсах",
    "question": "В чем разница между Debounce и Throttle и для каких событий пользовательского интерфейса применяется каждая техника?",
    "category": "JavaScript Optimization",
    "difficulty": "Junior",
    "answer": "Debounce (устранение дребезга) откладывает вызов функции до тех пор, пока с момента последнего события не пройдет заданное время. Если события продолжают поступать (например, пользователь быстро печатает в строке поиска), таймер каждый раз сбрасывается. Throttle (пропуск с тактовой частотой) гарантирует, что функция вызывается не чаще одного раза в заданный интервал времени (например, раз в 200 мс при скролле страницы или изменении размера окна window.resize).",
    "codeSnippet": "// Реализация Debounce:\nfunction debounce(fn, delay) {\n  let timer;\n  return function(...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), delay);\n  };\n}",
    "codeLanguage": "javascript",
    "keyTakeaways": [
      "Debounce идеален для поискового автокомплита и автосохранения форм",
      "Throttle идеален для событий scroll, resize, mousemove и drag-and-drop"
    ]
  },
  {
    "id": "q-fe-11",
    "directionId": "frontend",
    "subTrackId": "core",
    "title": "CORS и механизм Preflight запросов (OPTIONS)",
    "question": "Что такое CORS, почему браузер блокирует кросс-доменные запросы и когда отправляется Preflight запрос?",
    "category": "Web Security & Network",
    "difficulty": "Junior",
    "answer": "CORS (Cross-Origin Resource Sharing) — механизм безопасности браузера (Same-Origin Policy), запрещающий веб-странице делать AJAX-запросы к другому домену/порту/протоколу без явного разрешения сервера в заголовках (Access-Control-Allow-Origin). Если запрос является «непростым» (метод отличный от GET/POST/HEAD, нестандартные заголовки вроде Authorization или Content-Type: application/json), браузер сначала автоматически отправляет предварительный Preflight запрос методом OPTIONS, чтобы узнать, разрешает ли сервер такие операции.",
    "codeSnippet": "// Заголовки, которые обязан вернуть сервер на Preflight OPTIONS:\n// Access-Control-Allow-Origin: https://my-app.com\n// Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\n// Access-Control-Allow-Headers: Content-Type, Authorization",
    "codeLanguage": "http",
    "keyTakeaways": [
      "CORS проверяется и блокируется БРАУЗЕРОМ, а не сервером",
      "Preflight отправляется автоматически для методов PUT/DELETE или кастомных заголовков"
    ]
  },
  {
    "id": "q-fe-12",
    "directionId": "frontend",
    "subTrackId": "react",
    "title": "React Context vs Redux / Zustand: когда Context вредит производительности?",
    "question": "Почему React Context не всегда подходит в качестве полноценного глобального стейт-менеджера?",
    "category": "React Architecture",
    "difficulty": "Junior+",
    "answer": "Context API создавался для передачи неизменяемых или редко меняющихся данных (тема оформления, локаль языка, авторизованный пользователь). Проблема: при изменении значения в Provider ВСЕ компоненты, использующие useContext, будут принудительно перерисованы, даже если им нужна только часть обновленного объекта (нет встроенного механизма селекторов). В отличие от Context, библиотеки Redux Toolkit и Zustand поддерживают селекторы (useSelector / useStore(s => s.item)), что изолирует рендеры и обновляет только зависящие компоненты.",
    "codeSnippet": "// В Zustand перерендерится только тогда, когда изменилось поле count:\nconst count = useStore(state => state.count);\n\n// В Context при любом изменении объекта перерендерится весь компонент:\nconst { count } = useContext(AppContext);",
    "codeLanguage": "tsx",
    "keyTakeaways": [
      "Используйте Context для редких глобальных параметров (тема, язык)",
      "Используйте Zustand/Redux для часто обновляемого стейта со сложными подписками"
    ]
  },
  {
    "id": "q-fe-13",
    "directionId": "frontend",
    "subTrackId": "react",
    "title": "Предохранители ошибок (Error Boundaries) в React",
    "question": "Что такое Error Boundary в React, какие ошибки он НЕ может перехватить?",
    "category": "React Core",
    "difficulty": "Junior+",
    "answer": "Error Boundary — это компонент, который перехватывает JavaScript-ошибки в дочернем дереве компонентов, логирует их и отображает запасной UI (fallback) вместо белого экрана. Он реализуется через методы жизненного цикла componentDidCatch и static getDerivedStateFromError. Error Boundary НЕ перехватывает ошибки: 1) внутри обработчиков событий (onClick — для них нужен обычный try/catch); 2) в асинхронном коде (setTimeout, fetch); 3) при серверном рендеринге (SSR); 4) ошибки в самом компоненте-предохранителе.",
    "codeSnippet": "class ErrorBoundary extends React.Component {\n  state = { hasError: false };\n  static getDerivedStateFromError(error) {\n    return { hasError: true };\n  }\n  componentDidCatch(error, errorInfo) {\n    logErrorToService(error, errorInfo);\n  }\n  render() {\n    if (this.state.hasError) return <h2>Что-то пошло не так.</h2>;\n    return this.props.children;\n  }\n}",
    "codeLanguage": "tsx",
    "keyTakeaways": [
      "Error Boundary предотвращает падение всего дерева React-приложения",
      "Для функциональных компонентов часто используют готовую библиотеку react-error-boundary"
    ]
  },
  {
    "id": "q-fe-14",
    "directionId": "frontend",
    "subTrackId": "angular",
    "title": "Change Detection Strategy: Default vs OnPush в Angular",
    "question": "Как работает ChangeDetectionStrategy.OnPush и когда Angular запускает проверку изменений компонента?",
    "category": "Angular Optimization",
    "difficulty": "Junior+",
    "answer": "По умолчанию (Default) Angular проверяет все дерево компонентов при любом асинхронном событии (клик, таймер, ответ HTTP), что в больших приложениях создает просадки FPS. Стратегия OnPush указывает Angular проверять компонент ТОЛЬКО в четырех случаях: 1) Входной параметр @Input() изменился по ссылке (новая ссылка на объект/массив); 2) Внутри самого компонента или его детей произошло событие шаблона (click, change); 3) В шаблоне сработал async pipe для Observable/Signal; 4) Вручную вызван ChangeDetectorRef.markForCheck().",
    "codeSnippet": "@Component({\n  selector: 'app-user-card',\n  standalone: true,\n  changeDetection: ChangeDetectionStrategy.OnPush,\n  template: `<div>{{ user.name }}</div>`\n})\nexport class UserCardComponent {\n  @Input() user!: User;\n}",
    "codeLanguage": "typescript",
    "keyTakeaways": [
      "OnPush требует соблюдения иммутабельности данных (spread операторы {...user})",
      "Резко снижает количество проверок в дереве компонентов"
    ]
  },
  {
    "id": "q-fe-15",
    "directionId": "frontend",
    "subTrackId": "vue",
    "title": "Pinia: архитектура современного стейт-менеджера для Vue 3",
    "question": "Почему Pinia заменила Vuex и как устроен store в Composition API синтаксисе?",
    "category": "Vue 3 State",
    "difficulty": "Junior",
    "answer": "Pinia стала официальным стейт-менеджером Vue 3, устранив сложные мутации из Vuex. В Pinia есть только: state (данные), getters (вычисляемые свойства) и actions (синхронные и асинхронные методы). Pinia полностью типизирована в TypeScript из коробки и поддерживает легкий setup-синтаксис в виде функций с ref() и computed().",
    "codeSnippet": "import { defineStore } from 'pinia';\nimport { ref, computed } from 'vue';\n\nexport const useCartStore = defineStore('cart', () => {\n  const items = ref<string[]>([]);\n  const totalCount = computed(() => items.value.length);\n\n  function addItem(item: string) {\n    items.value.push(item);\n  }\n\n  return { items, totalCount, addItem };\n});",
    "codeLanguage": "typescript",
    "keyTakeaways": [
      "Отсутствие лишнего слоя мутаций (mutations) упрощает код",
      "Поддержка модульности и автоматический tree-shaking неиспользуемых сторов"
    ]
  },
  {
    "id": "q-be-10",
    "directionId": "backend",
    "subTrackId": "core",
    "title": "Проблема N+1 запросов в ORM и способы ее устранения",
    "question": "Что такое проблема N+1 запросов к базе данных и как ее решить?",
    "category": "ORM & Databases",
    "difficulty": "Junior",
    "answer": "Проблема N+1 возникает, когда при выборке N родительских записей ORM для каждой из них делает отдельный подзапрос к связанной таблице. Например, загрузка 100 авторов делает 1 запрос SELECT * FROM authors, а затем в цикле 100 запросов SELECT * FROM books WHERE author_id = X. Итого: 101 запрос! Решается жадной загрузкой (Eager Loading): объединением таблиц через JOIN (JOIN FETCH в Hibernate, selectinload / joinedload в SQLAlchemy, prefetch_related в Django, include в Prisma).",
    "codeSnippet": "# В SQLAlchemy 2.0 решение:\nstmt = select(Author).options(selectinload(Author.books))\nauthors = await session.scalars(stmt)\n# Всего 2 быстрых запроса вместо 101!",
    "codeLanguage": "python",
    "keyTakeaways": [
      "Всегда логируйте генерируемые ORM SQL-запросы в процессе разработки",
      "Используйте Eager loading для связанных коллекций"
    ]
  },
  {
    "id": "q-be-11",
    "directionId": "backend",
    "subTrackId": "core",
    "title": "Стратегии вытеснения кэша в Redis: LRU vs LFU vs TTL",
    "question": "Какие алгоритмы вытеснения (eviction policies) использует Redis при нехватке памяти?",
    "category": "Caching & Redis",
    "difficulty": "Junior+",
    "answer": "Когда память Redis заполняется до maxmemory, сервер применяет выбранную политику вытеснения (maxmemory-policy): 1) volatile-lru / allkeys-lru (Least Recently Used) — удаляет ключи, к которым дольше всего не обращались; 2) volatile-lfu / allkeys-lfu (Least Frequently Used) — удаляет наименее часто запрашиваемые ключи; 3) volatile-ttl — удаляет ключи с наименьшим оставшимся временем жизни (TTL); 4) noeviction — возвращает ошибку на запись (OOM), сохраняя имеющиеся данные.",
    "codeSnippet": "# Конфигурация redis.conf:\nmaxmemory 2gb\nmaxmemory-policy allkeys-lru",
    "codeLanguage": "text",
    "keyTakeaways": [
      "Всегда устанавливайте TTL на кэширующие ключи во избежание утечки памяти",
      "allkeys-lru — наиболее частый выбор для типового веб-кэша"
    ]
  },
  {
    "id": "q-be-12",
    "directionId": "backend",
    "subTrackId": "python",
    "title": "Менеджеры контекста в Python: протокол with и contextlib",
    "question": "Как устроен менеджер контекста (with) в Python и какие методы класса отвечают за его работу?",
    "category": "Python Advanced",
    "difficulty": "Junior",
    "answer": "Менеджер контекста гарантирует корректное выделение и гарантированное освобождение ресурсов (закрытие файлов, освобождение блокировок мьютексов, закрытие сессий БД) даже в случае исключений. Класс реализует методы __enter__(self) (подготовка ресурса) и __exit__(self, exc_type, exc_val, exc_tb) (очистка). Если __exit__ возвращает True, возникшее исключение подавляется. Также контекстный менеджер можно создать через генератор с декоратором @contextlib.contextmanager.",
    "codeSnippet": "from contextlib import contextmanager\n\n@contextmanager\ndef db_transaction():\n    session = create_session()\n    try:\n        yield session\n        session.commit()\n    except Exception:\n        session.rollback()\n        raise\n    finally:\n        session.close()",
    "codeLanguage": "python",
    "keyTakeaways": [
      "__enter__ инициализирует ресурс, __exit__ гарантированно вызывается в блоке finally",
      "Для асинхронного кода используются __aenter__ и __aexit__ (async with)"
    ]
  },
  {
    "id": "q-be-13",
    "directionId": "backend",
    "subTrackId": "golang",
    "title": "Пакет context в Go: отмена операций и передача метаданных",
    "question": "Зачем нужен context.Context в Go и почему его принято передавать первым аргументом функции?",
    "category": "Golang Core",
    "difficulty": "Junior",
    "answer": "context.Context передается по цепочке вызовов для контроля времени жизни запроса, отмены длительных операций и распространения сигналов завершения между горутинами. Например, если HTTP-клиент закрыл вкладку в браузере, context.WithCancel или WithTimeout закроет канал ctx.Done(), что позволяет оборвать тяжелые запросы к БД и предотвратить утечки горутин (goroutine leak). Первым аргументом ctx context.Context передается по официальному соглашению Go.",
    "codeSnippet": "func FetchUserData(ctx context.Context, userID int) (*User, error) {\n    req, err := http.NewRequestWithContext(ctx, \"GET\", url, nil)\n    if err != nil {\n        return nil, err\n    }\n    // Если контекст отменится по таймауту, HTTP клиент немедленно прекратит запрос\n    return client.Do(req)\n}",
    "codeLanguage": "go",
    "keyTakeaways": [
      "Никогда не храните Context внутри структуры, передавайте его явно в функцию",
      "Всегда вызывайте функцию cancel(), возвращаемую WithCancel/WithTimeout (через defer cancel())"
    ]
  },
  {
    "id": "q-be-14",
    "directionId": "backend",
    "subTrackId": "java",
    "title": "Аннотация @Transactional в Spring: уровни изоляции и Propagation",
    "question": "Как работает аннотация @Transactional в Spring и что делает Propagation.REQUIRED?",
    "category": "Spring Framework",
    "difficulty": "Junior+",
    "answer": "Spring реализует @Transactional с помощью AOP (Aspect-Oriented Programming) и прокси-оберток. Прокси открывает транзакцию перед вызовом метода и делает commit или rollback при неперехваченном RuntimeException. Propagation.REQUIRED (дефолтное значение) указывает: если уже существует активная транзакция, метод присоединяется к ней; если транзакции нет, создается новая. Важный нюанс: вызов метода с @Transactional из того же класса (self-invocation) не пройдет через Spring-прокси и транзакция НЕ откроется!",
    "codeSnippet": "@Service\npublic class OrderService {\n    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)\n    public void processOrder(OrderDto order) {\n        paymentService.charge(order);\n        inventoryService.reserve(order);\n    }\n}",
    "codeLanguage": "java",
    "keyTakeaways": [
      "По умолчанию Spring откатывает транзакцию только при unchecked исключениях (RuntimeException)",
      "Self-invocation не работает без внедрения контекста или рефакторинга в отдельный бин"
    ]
  },
  {
    "id": "q-be-15",
    "directionId": "backend",
    "subTrackId": "nodejs",
    "title": "Потоки (Streams) в Node.js и управление Backpressure",
    "question": "Что такое Streams в Node.js, какие виды потоков бывают и что такое Backpressure?",
    "category": "Node.js Streams",
    "difficulty": "Junior+",
    "answer": "Streams позволяют обрабатывать данные порциями (чанками) по мере поступления, не загружая весь файл целиком в оперативную память. Четыре типа: Readable (чтение), Writable (запись), Duplex (чтение и запись, например TCP сокет), Transform (модификация на лету, например gzip сжатие). Backpressure (обратное давление) возникает, когда источник отдает данные быстрее, чем приемник успевает их записывать. Метод pipeline или pipe автоматически регулирует поток данных, приостанавливая чтение (pause/resume), когда внутренний буфер переполнен.",
    "codeSnippet": "import fs from 'fs';\nimport zlib from 'zlib';\nimport { pipeline } from 'stream/promises';\n\n// Эффективное сжатие гигабайтного файла с мизерным расходом RAM:\nawait pipeline(\n  fs.createReadStream('huge_log.txt'),\n  zlib.createGzip(),\n  fs.createWriteStream('huge_log.txt.gz')\n);",
    "codeLanguage": "javascript",
    "keyTakeaways": [
      "Всегда используйте stream/promises pipeline вместо сырого pipe для корректной обработки ошибок",
      "Streams критически важны для обработки больших файлов и стриминга медиа"
    ]
  },
  {
    "id": "q-mob-4",
    "directionId": "mobile",
    "subTrackId": "android",
    "title": "Android ViewModel и сохранение состояния при повороте экрана",
    "question": "Почему ViewModel переживает переворот экрана (Configuration Change) и зачем нужен SavedStateHandle?",
    "category": "Android Jetpack",
    "difficulty": "Junior",
    "answer": "При повороте экрана Activity уничтожается и пересоздается заново (Configuration Change). ViewModel хранится в ViewModelStore, ассоциированном с жизненным циклом Activity, и не уничтожается. Однако если система Android принудительно убивает процесс приложения в фоне из-за нехватки оперативной памяти (Process Death), обычная ViewModel сотрется! Для выживания при убийстве процесса используется SavedStateHandle — специальный контейнер для сохранения критичных UI-данных (id текущего товара, текст ввода) в системный Bundle.",
    "codeSnippet": "class ProductViewModel(\n    private val savedStateHandle: SavedStateHandle\n) : ViewModel() {\n    // Выживает даже при убийстве процесса системой:\n    val productId: StateFlow<String> = savedStateHandle.getStateFlow(\"product_id\", \"\")\n}",
    "codeLanguage": "kotlin",
    "keyTakeaways": [
      "ViewModel переживает поворот экрана, но не выживает при смерти процесса",
      "SavedStateHandle сохраняет данные в savedInstanceState Bundle"
    ]
  },
  {
    "id": "q-mob-5",
    "directionId": "mobile",
    "subTrackId": "ios",
    "title": "Grand Central Dispatch (GCD) в iOS: Serial vs Concurrent очереди",
    "question": "Чем отличаются Serial и Concurrent очереди в GCD и почему UI обновляется только на DispatchQueue.main?",
    "category": "iOS Concurrency",
    "difficulty": "Junior",
    "answer": "Serial очередь выполняет задачи строго по очереди (последовательно, FIFO), гарантируя, что в один момент времени выполняется не более одной задачи (отлично подходит для защиты общего ресурса от race conditions). Concurrent очередь запускает задачи параллельно на разных потоках. UI-интерфейс в iOS построен на UIKit/SwiftUI, которые не являются потокобезопасными, и весь рендеринг завязан на RunLoop главного потока — обращение к UI из фонового потока вызывает глитчи интерфейса и краш.",
    "codeSnippet": "// Фоновые вычисления:\nDispatchQueue.global(qos: .userInitiated).async {\n    let result = heavyComputation()\n    \n    // Возврат в главный поток для отрисовки UI:\n    DispatchQueue.main.async {\n        self.resultLabel.text = result\n    }\n}",
    "codeLanguage": "swift",
    "keyTakeaways": [
      "Любое обновление пользовательского интерфейса должно происходить в DispatchQueue.main",
      "Serial очереди обеспечивают простую синхронизацию без явных мьютексов"
    ]
  },
  {
    "id": "q-mob-6",
    "directionId": "mobile",
    "subTrackId": "flutter",
    "title": "Паттерн BLoC (Business Logic Component) во Flutter",
    "question": "Как устроен паттерн BLoC во Flutter и чем он отличается от Cubit?",
    "category": "Flutter State Management",
    "difficulty": "Junior+",
    "answer": "BLoC разделяет интерфейс и бизнес-логику на основе реактивных потоков (Streams). В BLoC UI отправляет События (Events), BLoC их обрабатывает и эмитит новые Состояния (States). Интерфейс подписывается на состояния через BlocBuilder или BlocConsumer. Cubit — это упрощенная версия BLoC: вместо эвентов вызываются обычные функции (методы), что уменьшает количество бойлерплейта для простых экранов.",
    "codeSnippet": "// Событие:\nabstract class AuthEvent {}\nclass LoginRequested extends AuthEvent { final String email; LoginRequested(this.email); }\n\n// BLoC:\nclass AuthBloc extends Bloc<AuthEvent, AuthState> {\n  AuthBloc() : super(AuthInitial()) {\n    on<LoginRequested>((event, emit) async {\n      emit(AuthLoading());\n      // логика авторизации...\n      emit(AuthSuccess());\n    });\n  }\n}",
    "codeLanguage": "dart",
    "keyTakeaways": [
      "Событие -> BLoC -> Состояние -> UI",
      "Отличная тестируемость: входные события легко превращаются в проверяемые состояния"
    ]
  },
  {
    "id": "q-ds-5",
    "directionId": "data_science",
    "subTrackId": "ml",
    "title": "Дилемма смещения и дисперсии (Bias-Variance Tradeoff)",
    "question": "Что такое Bias и Variance в машинном обучении и как бороться с Underfitting и Overfitting?",
    "category": "Machine Learning Theory",
    "difficulty": "Junior",
    "answer": "Bias (Смещение) — ошибка от чрезмерного упрощения модели (Underfitting, недообучение): модель не способна уловить скрытые зависимости в данных (например, аппроксимация параболы прямой линией). Variance (Дисперсия) — ошибка от чрезмерной чувствительности к случайному шуму обучающей выборки (Overfitting, переобучение): модель идеально запоминает обучающие примеры, но проваливается на новых данных. Борьба с переобучением: сбор большего объема данных, регуляризация (L1/L2), уменьшение глубины деревьев, кросс-валидация, Dropout.",
    "codeSnippet": "# Признаки переобучения:\n# Train loss стремится к 0, а Validation loss начинает расти!",
    "codeLanguage": "text",
    "keyTakeaways": [
      "Высокий Bias = недообучение (нужна более сложная модель)",
      "Высокая Variance = переобучение (нужна регуляризация и больше данных)"
    ]
  },
  {
    "id": "q-ds-6",
    "directionId": "data_science",
    "subTrackId": "ml",
    "title": "Векторные эмбеддинги (Embeddings) и векторный поиск в LLM",
    "question": "Что такое эмбеддинги текста и как они используются в RAG (Retrieval-Augmented Generation)?",
    "category": "Deep Learning & LLM",
    "difficulty": "Junior+",
    "answer": "Эмбеддинг — это вектор чисел фиксированной длины (например, размерности 1536), полученный нейросетью, который отражает смысловое (семантическое) значение текста. Близкие по смыслу фразы (\"купить билет на поезд\" и \"железнодорожные билеты заказ\") имеют векторы с высоким косинусным сходством (Cosine Similarity). В архитектуре RAG база документов нарезается на чанки, для каждого вычисляется вектор и сохраняется в векторную БД. При вопросе пользователя ищется top-K релевантных фрагментов по расстоянию и подставляется в промпт для LLM.",
    "codeSnippet": "import numpy as np\n\ndef cosine_similarity(a, b):\n    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))\n# Значение близко к 1.0 -> тексты семантически похожи",
    "codeLanguage": "python",
    "keyTakeaways": [
      "Эмбеддинги переводят неструктурированный текст в векторное математическое пространство",
      "RAG устраняет галлюцинации LLM за счет добавления фактов из актуальной корпоративной базы знаний"
    ]
  },
  {
    "id": "q-ds-7",
    "directionId": "data_science",
    "subTrackId": "analytics",
    "title": "Когортный анализ и расчет Retention Rate",
    "question": "Что такое когортный анализ и как рассчитывается показатель Retention N-го дня?",
    "category": "Product Analytics",
    "difficulty": "Junior",
    "answer": "Когорта — это группа пользователей, совершивших определенное действие в один временной период (например, зарегистрировавшихся в приложении 1 марта). Retention Day N (удержание N-го дня) рассчитывается как: (Количество пользователей из когорты, вернувшихся в приложение в день N) / (Общий размер когорты в день 0) * 100%. График Retention позволяет увидеть плато удержания продукта (Product-Market Fit).",
    "codeSnippet": "-- Базовый расчет Retention в SQL:\nSELECT \n  cohort_date,\n  COUNT(DISTINCT user_id) as cohort_size,\n  COUNT(DISTINCT CASE WHEN activity_date = cohort_date + INTERVAL '7 day' THEN user_id END) as day_7_users\nFROM user_activity\nGROUP BY cohort_date;",
    "codeLanguage": "sql",
    "keyTakeaways": [
      "Когортный анализ позволяет объективно оценивать изменения в продукте без искажения новыми пользователями",
      "Выход кривой Retention на горизонтальное плато говорит о наличии лояльного ядра аудитории"
    ]
  },
  {
    "id": "q-qa-4",
    "directionId": "qa",
    "subTrackId": "core",
    "title": "Тестирование безопасности: SQL-инъекции и XSS атаки",
    "question": "В чем суть уязвимостей SQL Injection и Cross-Site Scripting (XSS) и как их проверять?",
    "category": "Security Testing",
    "difficulty": "Junior",
    "answer": "SQL-инъекция происходит, когда пользовательский ввод напрямую конкатенируется в SQL-запрос без экранирования. Тестировщик проверяет поля ввода спецсимволами (' OR 1=1 --) и следит за ошибками синтаксиса базы. Защита — параметризованные запросы (prepared statements). XSS (межсайтовый скриптинг) возникает, когда введенный вредоносный HTML/JS (<script>alert(1)</script>) сохраняется и исполняется в браузере других пользователей. Тестировщик проверяет экранирование ввода и заголовки Content Security Policy (CSP).",
    "codeSnippet": "// Опасный код:\nconst query = \"SELECT * FROM users WHERE name = '\" + userInput + \"'\";\n// Если userInput = \"admin' --\", запрос вернет админа без пароля!",
    "codeLanguage": "javascript",
    "keyTakeaways": [
      "Никогда не доверяйте данным от клиента (валидация на бэкенде обязательна)",
      "Проверяйте наличие флагов HttpOnly и Secure у куки авторизации"
    ]
  },
  {
    "id": "q-qa-5",
    "directionId": "qa",
    "subTrackId": "manual_qa",
    "title": "Сниффинг мобильного трафика: Charles Proxy и SSL Pinning",
    "question": "Что такое SSL Pinning в мобильных приложениях и как тестировщику перехватывать HTTPS трафик?",
    "category": "Mobile QA",
    "difficulty": "Junior+",
    "answer": "Для перехвата HTTPS трафика в Charles Proxy устанавливается корневой SSL-сертификат (Root Certificate) на тестируемое устройство и включается SSL Proxying (атака Man-in-the-Middle с разрешения пользователя). Однако если в приложении включен SSL Pinning, приложение доверяет только жестко зашитому открытому ключу сервера и отклоняет поддельный сертификат Charles с ошибкой Handshake. Для тестирования на тестовых сборках отключают SSL Pinning в коде (или через конфигурацию network_security_config в Android), либо используют Frida / Xposed для обхода на рутованном устройстве.",
    "codeSnippet": "<!-- res/xml/network_security_config.xml для debug-сборок Android: -->\n<network-security-config>\n  <debug-overrides>\n    <trust-anchors>\n      <certificates src=\"user\" />\n    </trust-anchors>\n  </debug-overrides>\n</network-security-config>",
    "codeLanguage": "xml",
    "keyTakeaways": [
      "SSL Pinning защищает пользователей от перехвата трафика в публичных сетях",
      "Для локального QA-тестирования сертификат Чарльза добавляется в доверенные системные сертификаты"
    ]
  },
  {
    "id": "q-qa-6",
    "directionId": "qa",
    "subTrackId": "auto_qa",
    "title": "Флакающие автотесты (Flaky Tests) и явные ожидания",
    "question": "Почему возникают мигающие (flaky) автотесты и почему нельзя использовать time.sleep()?",
    "category": "QA Automation",
    "difficulty": "Junior",
    "answer": "Flaky тест — это тест, который на одном и том же коде иногда проходит успешно, а иногда падает. Главная причина — гонки состояний (Race Conditions) и использование жестких задержек time.sleep(5). Если сервер ответит за 5.1 секунды — тест упадет; если за 1 секунду — 4 секунды тратятся впустую. Решение: использовать явные динамические ожидания (Explicit Waits) или встроенный автовейт в Playwright, который ожидает готовности элемента к действию (видимость, стабильность позиции, кликабельность) перед кликом.",
    "codeSnippet": "# ПЛОХО:\ntime.sleep(5)\ndriver.find_element(By.ID, \"submit\").click()\n\n# ХОРОШО (Playwright с авто-ожиданием):\nawait page.locator('#submit').click() # сам дождется кликабельности!",
    "codeLanguage": "python",
    "keyTakeaways": [
      "Никогда не используйте фиксированный sleep в автотестах",
      "Используйте Playwright auto-waiting или WebDriverWait с условиями presence_of_element_located"
    ]
  },
  {
    "id": "q-dev-5",
    "directionId": "devops",
    "subTrackId": "cicd_docker",
    "title": "Кэширование слоев в Docker и порядок инструкций в Dockerfile",
    "question": "Как Docker кэширует слои при сборке и почему команду COPY package.json ставят ДО COPY . .?",
    "category": "Docker Best Practices",
    "difficulty": "Junior",
    "answer": "Каждая инструкция в Dockerfile создает новый слой образа. При повторной сборке Docker проверяет: если инструкция и ее входные файлы не изменились, берется готовый слой из кэша. Если слой инвалидируется, ВСЕ последующие слои пересобираются заново! Исходный код приложения меняется при каждом коммите, а package.json/requirements.txt меняются редко. Если сначала скопировать package.json и выполнить npm install, то при изменении только кода npm install возьмется мгновенно из кэша!",
    "codeSnippet": "# ПРАВИЛЬНЫЙ ПОРЯДОК:\nCOPY package.json package-lock.json ./\nRUN npm ci # берется из кэша, сборка длится 2 секунды!\n\nCOPY . . # инвалидирует только этот и следующие слои\nRUN npm run build",
    "codeLanguage": "dockerfile",
    "keyTakeaways": [
      "Ставьте редко изменяемые инструкции в начало Dockerfile",
      "Используйте файл .dockerignore для исключения node_modules, .git и логов"
    ]
  },
  {
    "id": "q-dev-6",
    "directionId": "devops",
    "subTrackId": "k8s_iac",
    "title": "Стратегии развертывания: Rolling Update vs Blue-Green vs Canary",
    "question": "В чем разница между Rolling Update, Blue-Green и Canary деплоем в Kubernetes?",
    "category": "Kubernetes Deployments",
    "difficulty": "Junior+",
    "answer": "1) Rolling Update (дефолт в K8s): поочередное создание новых подов с постепенным удалением старых, нулевой простой (Zero Downtime), но в процессе сосуществуют две версии; 2) Blue-Green: поднимается полностью идентичное новое окружение (Green) с новой версией. После тестирования роутер/Ingress мгновенно переключает 100% трафика с Blue на Green. Моментальный откат, но требует удвоения серверов; 3) Canary (Канареечный): новая версия выкатывается на малую долю пользователей (например 5%). Анализируются метрики ошибок и задержек, после чего релиз плавно раскатывается до 100%.",
    "codeSnippet": "strategy:\n  type: RollingUpdate\n  rollingUpdate:\n    maxSurge: 25%\n    maxUnavailable: 0%",
    "codeLanguage": "yaml",
    "keyTakeaways": [
      "Canary минимизирует масштаб влияния потенциального бага в продакшене",
      "Blue-Green обеспечивает мгновенный безопасный откат переключением трафика"
    ]
  },
  {
    "id": "q-dev-7",
    "directionId": "devops",
    "subTrackId": "core",
    "title": "Linux: Управление правами доступа chmod и chown",
    "question": "Что означают права 755 и 644 в Linux и как они вычисляются?",
    "category": "Linux Administration",
    "difficulty": "Junior",
    "answer": "Права делятся на три группы: Владелец (User), Группа (Group), Остальные (Others). Каждая позиция — сумма битов: 4 (r, read, чтение), 2 (w, write, запись), 1 (x, execute, выполнение). 755 означает: Владелец имеет 4+2+1=7 (rwx), Группа 4+0+1=5 (r-x), Остальные 4+0+1=5 (r-x). Стандарт для исполняемых скриптов и директорий. 644 означает: Владелец 4+2=6 (rw-), Группа 4 (r--), Остальные 4 (r--). Стандарт для обычных файлов конфигурации.",
    "codeSnippet": "chmod 755 /var/www/script.sh\nchmod 644 /etc/nginx/nginx.conf\nchown -R www-data:www-data /var/www/html",
    "codeLanguage": "bash",
    "keyTakeaways": [
      "Директория обязательно требует бит исполнения (x), чтобы в нее можно было перейти (cd)",
      "chown меняет владельца и группу, chmod меняет биты доступа"
    ]
  }
];
