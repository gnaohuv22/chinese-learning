/**
 * Seed script: populates Firebase Firestore with sample data for testing.
 *
 * Usage:
 *   node scripts/seed.mjs
 *
 * Requires: firebase package (already installed as a project dep).
 * The script reads Firebase config from environment variables (or .env).
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- Load .env manually (no dotenv dependency needed) ----
try {
  const envPath = resolve(__dirname, '../.env');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env not found, rely on actual environment variables
}

// ---- Firebase init ----
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  serverTimestamp,
  getDocs,
  query,
  deleteDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error('ERROR: FIREBASE_PROJECT_ID not set. Check your .env file.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---- Helpers ----
async function clearCollection(path) {
  const snap = await getDocs(query(collection(db, path)));
  for (const d of snap.docs) await deleteDoc(d.ref);
}

async function add(path, data) {
  const ref = await addDoc(collection(db, path), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

async function addExerciseWithFlatCopy(nestedPath, exerciseData) {
  const ref = await addDoc(collection(db, nestedPath), {
    ...exerciseData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Also write to flat exercises collection so exam can fetch by ID
  await setDoc(doc(db, 'exercises', ref.id), {
    ...exerciseData,
    id: ref.id,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// ---- Sample data (Vietnamese with diacritics) ----
const COURSES = [
  {
    title: 'Nhập môn Hán tự — Cơ bản',
    description: 'Làm quen với chữ Hán, thanh điệu, âm vần và 100 từ phổ biến cơ bản nhất.',
    order: 0,
  },
  {
    title: 'Trung cấp — Giao tiếp hàng ngày',
    description: 'Các chủ đề giao tiếp thực tế: ăn uống, đi lại, mua sắm, sức khoẻ.',
    order: 1,
  },
];

const LESSONS_BY_COURSE = [
  // Khóa 0
  [
    { title: 'Bài 1: Chào hỏi và tự giới thiệu', order: 0, skills: ['listening', 'speaking'] },
    { title: 'Bài 2: Số đếm và ngày tháng', order: 1, skills: ['reading', 'writing'] },
    { title: 'Bài 3: Gia đình và quan hệ xã hội', order: 2, skills: ['listening', 'speaking', 'reading', 'writing'] },
  ],
  // Khóa 1
  [
    { title: 'Bài 1: Đặt món tại nhà hàng', order: 0, skills: ['listening', 'speaking'] },
    { title: 'Bài 2: Mua sắm tại chợ', order: 1, skills: ['reading', 'writing'] },
  ],
];

// exercises[courseIndex][lessonIndex] = array of exercises
const EXERCISES_BY_LESSON = [
  // Khóa 0, Bài 0: Chào hỏi
  [
    [
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"你好" có nghĩa là gì?',
        options: ['Tạm biệt', 'Xin chào', 'Cảm ơn', 'Xin lỗi'],
        answer: '1',
        order: 0,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"我叫李明" dịch sang tiếng Việt là gì?',
        options: ['Tôi là người Trung Quốc', 'Tôi tên là Lý Minh', 'Tôi đi học', 'Xin chào Lý Minh'],
        answer: '1',
        order: 1,
        shuffle: true,
      },
      {
        type: 'speaking_topic',
        skill: 'speaking',
        prompt: 'Hãy tự giới thiệu bản thân bằng tiếng Trung (tên, tuổi, quê quán)',
        outline: ['Nói tên của bạn: 我叫...', 'Nói tuổi của bạn: 我...岁', 'Nói bạn đến từ đâu: 我是...人'],
        durationSeconds: 60,
        order: 2,
      },
    ],
    // Khóa 0, Bài 1: Số đếm
    [
      {
        type: 'mcq',
        skill: 'reading',
        prompt: '"三十五" là số mấy?',
        options: ['53', '35', '33', '55'],
        answer: '1',
        order: 0,
      },
      {
        type: 'scramble',
        skill: 'reading',
        prompt: 'Sắp xếp lại các chữ sau thành câu có nghĩa:',
        answer: '今天 是 星期三',
        order: 1,
      },
      {
        type: 'guided_writing',
        skill: 'writing',
        prompt: 'Viết một đoạn văn ngắn (3–5 câu) giới thiệu ngày sinh nhật của bạn.',
        keywords: ['生日', '年', '月', '日', '岁'],
        order: 2,
      },
    ],
    // Khóa 0, Bài 2: Gia đình
    [
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"哥哥" có nghĩa là gì?',
        options: ['Em trai', 'Em gái', 'Anh trai', 'Chị gái'],
        answer: '2',
        order: 0,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'listening',
        prompt: 'Từ nào sau đây KHÔNG phải là từ chỉ thành viên gia đình?',
        options: ['妈妈', '爸爸', '朋友', '妹妹'],
        answer: '2',
        order: 1,
      },
      {
        type: 'speaking_record',
        skill: 'speaking',
        prompt: 'Hãy ghi âm mô tả về gia đình của bạn bằng tiếng Trung.',
        outline: ['Gia đình tôi có mấy người?', 'Giới thiệu từng thành viên', 'Nghề nghiệp của họ'],
        order: 2,
      },
      {
        type: 'guided_writing',
        skill: 'writing',
        prompt: 'Viết đoạn văn giới thiệu gia đình bạn gồm những ai, làm gì.',
        keywords: ['家庭', '父母', '兄弟', '姐妹', '工作'],
        order: 3,
      },
    ],
  ],
  // Khóa 1, Bài 0: Đặt món
  [
    [
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"我想要一碗米饭" có nghĩa là gì?',
        options: ['Tôi muốn uống trà', 'Tôi muốn một bát cơm', 'Cho tôi xem thực đơn', 'Bao nhiêu tiền?'],
        answer: '1',
        order: 0,
        shuffle: true,
      },
      {
        type: 'audio_mcq',
        skill: 'listening',
        prompt: 'Nghe đoạn hội thoại và cho biết họ gọi món gì?',
        options: ['Mì và trà', 'Cơm và nước', 'Phở và cà phê', 'Bánh mì và sữa'],
        answer: '0',
        order: 1,
      },
      {
        type: 'speaking_topic',
        skill: 'speaking',
        prompt: 'Hãy gọi món ăn tại nhà hàng bằng tiếng Trung',
        outline: ['Xin phép gọi nước: 服务员，请给我...', 'Gọi món chính: 我要...', 'Hỏi giá tiền: 多少钱?'],
        durationSeconds: 90,
        order: 2,
      },
    ],
    // Khóa 1, Bài 1: Mua sắm
    [
      {
        type: 'mcq',
        skill: 'reading',
        prompt: '"这件衣服多少钱?" có nghĩa là gì?',
        options: ['Áo này đẹp không?', 'Áo này bao nhiêu tiền?', 'Tôi có thể mặc thử không?', 'Có màu khác không?'],
        answer: '1',
        order: 0,
        shuffle: true,
      },
      {
        type: 'scramble',
        skill: 'reading',
        prompt: 'Sắp xếp thành câu mua sắm hoàn chỉnh:',
        answer: '这个 苹果 怎么 卖',
        order: 1,
      },
      {
        type: 'guided_writing',
        skill: 'writing',
        prompt: 'Mô tả một chuyến đi mua sắm của bạn.',
        keywords: ['商店', '价格', '便宜', '贵', '买'],
        order: 2,
      },
    ],
  ],
];

const NEWS_LIST = [
  {
    title: 'Ứng dụng ra mắt phiên bản mới với nhiều tính năng học ngữ pháp',
    content:
      'Chúng tôi vui mừng thông báo phiên bản 2.0 đã chính thức ra mắt với hệ thống bài tập ngữ pháp được tổ chức theo cấp độ HSK từ 1 đến 6. Người dùng có thể theo dõi tiến trình học, làm bài kiểm tra thử và xem lại lịch sử các bài đã hoàn thành.\n\nPhiên bản này cũng bổ sung hơn 500 bài tập mới, bao gồm các dạng: trắc nghiệm, điền vào chỗ trống, viết theo gợi ý và luyện nói theo chủ đề.',
    publishedAt: new Date('2026-03-15'),
  },
  {
    title: 'Khoá học "Tiểu thuyết cổ đại Trung Quốc" chính thức mở đăng ký',
    content:
      'Khoá học mới nhất của chúng tôi tập trung vào việc đọc hiểu các tác phẩm văn học cổ điển Trung Quốc như "Hồng lâu mộng", "Tam quốc chí diễn nghĩa" và "Tây du ký".\n\nKhoá học phù hợp với người học ở trình độ trung cấp trở lên, đã có nền tảng ngữ pháp HSK 4 và vốn từ vựng tối thiểu 2000 từ.',
    publishedAt: new Date('2026-04-01'),
  },
  {
    title: 'Mẹo học thành ngữ tiếng Trung hiệu quả',
    content:
      'Thành ngữ tiếng Trung (成语 — Thành ngữ) là một phần quan trọng của ngôn ngữ và văn hoá Trung Hoa. Bài viết này tổng hợp 5 phương pháp học thành ngữ hiệu quả nhất.\n\n1. Học qua câu chuyện nguồn gốc\n2. Nhóm thành ngữ theo chủ đề\n3. Sử dụng flashcard và phần mềm SRS\n4. Luyện viết câu ví dụ\n5. Xem phim, đọc truyện có sử dụng thành ngữ',
    publishedAt: new Date('2026-04-05'),
  },
];

const EXAMS = [
  {
    title: 'Đề thi thử HSK 2 — Tháng 4/2026',
    timeLimitSeconds: 3600,
  },
];

// ---- Main seed function ----
async function seed() {
  console.log('Connecting to Firebase project:', firebaseConfig.projectId);
  console.log('Starting seed...\n');

  // Clear existing data
  console.log('Clearing existing collections...');
  await clearCollection('news');
  await clearCollection('exams');
  await clearCollection('exercises');
  // Note: courses/lessons/exercises would need recursive clearing - skip for simplicity

  // Seed courses + lessons + exercises
  const courseIds = [];
  for (let ci = 0; ci < COURSES.length; ci++) {
    const courseId = await add('courses', COURSES[ci]);
    courseIds.push(courseId);
    console.log(`Created course [${ci}]: ${COURSES[ci].title} (${courseId})`);

    const lessonDefs = LESSONS_BY_COURSE[ci] ?? [];
    const lessonIds = [];
    for (let li = 0; li < lessonDefs.length; li++) {
      const lessonId = await add(`courses/${courseId}/lessons`, lessonDefs[li]);
      lessonIds.push(lessonId);
      console.log(`  Created lesson [${li}]: ${lessonDefs[li].title} (${lessonId})`);

      const exerciseDefs = EXERCISES_BY_LESSON[ci]?.[li] ?? [];
      const exerciseIds = [];
      for (const ex of exerciseDefs) {
        const enriched = { ...ex, courseId, lessonId };
        const exId = await addExerciseWithFlatCopy(
          `courses/${courseId}/lessons/${lessonId}/exercises`,
          enriched
        );
        exerciseIds.push(exId);
        console.log(`    Created exercise: [${ex.skill}/${ex.type}] ${ex.prompt.slice(0, 40)}...`);
      }
    }
  }

  // Seed news
  console.log('\nSeeding news...');
  for (const n of NEWS_LIST) {
    const id = await add('news', n);
    console.log(`  Created news: ${n.title.slice(0, 50)} (${id})`);
  }

  // Seed exams - collect exercise IDs by skill from the first course
  console.log('\nSeeding exams...');
  // Gather exercise IDs from first course's lessons for the sample exam
  const examSections = { listening: [], speaking: [], reading: [], writing: [] };
  const firstCourseId = courseIds[0];
  if (firstCourseId) {
    const snap = await getDocs(collection(db, `courses/${firstCourseId}/lessons`));
    for (const lessonDoc of snap.docs) {
      const exSnap = await getDocs(collection(db, `courses/${firstCourseId}/lessons/${lessonDoc.id}/exercises`));
      for (const exDoc of exSnap.docs) {
        const skill = exDoc.data().skill ?? 'listening';
        if (['listening','speaking','reading','writing'].includes(skill)) {
          examSections[skill].push(exDoc.id);
        }
      }
    }
  }

  for (const exam of EXAMS) {
    const id = await add('exams', {
      ...exam,
      sections: examSections,
    });
    console.log(`  Created exam: ${exam.title} (${id})`);
  }

  console.log('\nSeed complete!');
  console.log(`\nSummary:`);
  console.log(`  - ${COURSES.length} courses`);
  console.log(`  - ${LESSONS_BY_COURSE.flat().length} lessons`);
  console.log(`  - ${EXERCISES_BY_LESSON.flat(2).length} exercises`);
  console.log(`  - ${NEWS_LIST.length} news articles`);
  console.log(`  - ${EXAMS.length} exams`);
  console.log('\nYou can now open the app and see sample data!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
