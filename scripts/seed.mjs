/**
 * Seed script — populates Firebase Firestore with Hán Ngữ Ký course data.
 *
 * Usage:
 *   node scripts/seed.mjs
 *
 * Requires: firebase package (already installed as a project dep).
 * The script reads Firebase config from .env at project root.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- Load .env manually ----
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
  // .env not found — rely on actual environment variables
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
  console.log(`  Cleared ${snap.size} docs from [${path}]`);
}

/** Recursively delete a course's subcollections then the course itself. */
async function deleteCourse(courseId) {
  const lessonsSnap = await getDocs(collection(db, `courses/${courseId}/lessons`));
  for (const lessonDoc of lessonsSnap.docs) {
    const exSnap = await getDocs(
      collection(db, `courses/${courseId}/lessons/${lessonDoc.id}/exercises`)
    );
    for (const exDoc of exSnap.docs) await deleteDoc(exDoc.ref);
    await deleteDoc(lessonDoc.ref);
  }
  await deleteDoc(doc(db, 'courses', courseId));
}

async function clearCourses() {
  const snap = await getDocs(collection(db, 'courses'));
  for (const d of snap.docs) await deleteCourse(d.id);
  console.log(`  Cleared ${snap.size} courses (with subcollections)`);
}

async function add(path, data) {
  const ref = await addDoc(collection(db, path), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

async function addExercise(nestedPath, exerciseData) {
  const ref = await addDoc(collection(db, nestedPath), {
    ...exerciseData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Mirror to flat `exercises` collection so exams can reference by ID
  await setDoc(doc(db, 'exercises', ref.id), {
    ...exerciseData,
    id: ref.id,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// =============================================================================
// DATASET — 4 Học phần (HSK-aligned, full Vietnamese with diacritics)
// =============================================================================

const COURSES = [
  {
    order: 1,
    title: 'Học phần 1 — Nhập môn: Giao tiếp cơ bản',
    description:
      'Làm quen với bảng âm tiết tiếng Trung (bính âm), 4 thanh điệu và hơn 150 từ vựng thiết yếu. Luyện tập chào hỏi, tự giới thiệu, hỏi thăm ngày tháng và số đếm trong cuộc sống hàng ngày.',
  },
  {
    order: 2,
    title: 'Học phần 2 — Sơ cấp: Cuộc sống hàng ngày',
    description:
      'Xây dựng vốn từ vựng về gia đình, ăn uống, đi lại và mua sắm. Rèn luyện các mẫu câu hỏi—đáp thông dụng trong sinh hoạt hàng ngày, tương đương trình độ HSK 2–3.',
  },
  {
    order: 3,
    title: 'Học phần 3 — Trung cấp: Công việc và xã hội',
    description:
      'Mở rộng khả năng giao tiếp về chủ đề nghề nghiệp, sức khoẻ, du lịch và các tình huống xã hội. Tập trung vào ngữ pháp trung cấp và diễn đạt ý kiến, tương đương HSK 3–4.',
  },
  {
    order: 4,
    title: 'Học phần 4 — Nâng cao: Văn hoá và tư duy',
    description:
      'Đọc hiểu văn bản phức tạp, phân tích thành ngữ và viết luận về các chủ đề văn hoá, lịch sử, thời sự Trung Quốc. Luyện tập diễn đạt học thuật, tương đương HSK 4–5.',
  },
];

// Lessons per course [courseIndex][lessonIndex]
const LESSONS = [
  // ----- Học phần 1 -----
  [
    {
      title: 'Bài 1: Chào hỏi và tự giới thiệu',
      order: 1,
      skills: ['listening', 'speaking'],
    },
    {
      title: 'Bài 2: Số đếm, ngày tháng và thời gian',
      order: 2,
      skills: ['listening', 'reading', 'writing'],
    },
    {
      title: 'Bài 3: Màu sắc, đồ vật và hướng dẫn đơn giản',
      order: 3,
      skills: ['reading', 'speaking', 'writing'],
    },
  ],
  // ----- Học phần 2 -----
  [
    {
      title: 'Bài 1: Gia đình và mối quan hệ',
      order: 1,
      skills: ['listening', 'speaking', 'writing'],
    },
    {
      title: 'Bài 2: Ẩm thực và đặt món tại nhà hàng',
      order: 2,
      skills: ['listening', 'speaking', 'reading'],
    },
    {
      title: 'Bài 3: Đi lại và phương tiện giao thông',
      order: 3,
      skills: ['reading', 'writing', 'listening'],
    },
  ],
  // ----- Học phần 3 -----
  [
    {
      title: 'Bài 1: Nghề nghiệp và môi trường làm việc',
      order: 1,
      skills: ['listening', 'speaking', 'writing'],
    },
    {
      title: 'Bài 2: Sức khoẻ, bệnh viện và chăm sóc bản thân',
      order: 2,
      skills: ['reading', 'speaking', 'listening'],
    },
    {
      title: 'Bài 3: Du lịch và khám phá văn hoá địa phương',
      order: 3,
      skills: ['reading', 'writing', 'speaking'],
    },
  ],
  // ----- Học phần 4 -----
  [
    {
      title: 'Bài 1: Thành ngữ và tục ngữ Trung Hoa',
      order: 1,
      skills: ['reading', 'writing', 'speaking'],
    },
    {
      title: 'Bài 2: Lịch sử và truyền thống Trung Quốc',
      order: 2,
      skills: ['reading', 'writing', 'listening'],
    },
    {
      title: 'Bài 3: Thời sự, quan điểm và tranh luận',
      order: 3,
      skills: ['reading', 'writing', 'speaking', 'listening'],
    },
  ],
];

// Exercises per course-lesson [courseIndex][lessonIndex][]
const EXERCISES = [
  // ==========================================================================
  // Học phần 1
  // ==========================================================================
  [
    // --- Bài 1: Chào hỏi ---
    [
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"你好" có nghĩa là gì?',
        options: ['Tạm biệt', 'Xin chào', 'Cảm ơn', 'Xin lỗi'],
        answer: '1',
        order: 1,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'listening',
        prompt: 'Câu nào dưới đây dùng để hỏi tên người khác?',
        options: ['你好吗?', '你叫什么名字?', '你多大了?', '你是哪里人?'],
        answer: '1',
        order: 2,
        shuffle: false,
      },
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"再见" được dùng trong tình huống nào?',
        options: [
          'Khi gặp ai đó lần đầu',
          'Khi muốn hỏi tên',
          'Khi chia tay và tạm biệt',
          'Khi muốn cảm ơn',
        ],
        answer: '2',
        order: 3,
        shuffle: true,
      },
      {
        type: 'speaking_topic',
        skill: 'speaking',
        prompt: 'Hãy tự giới thiệu bản thân bằng tiếng Trung (tên, tuổi, quê quán).',
        outline: [
          '我叫... (Tôi tên là...)',
          '我今年...岁 (Năm nay tôi...tuổi)',
          '我是越南人，我来自... (Tôi là người Việt Nam, đến từ...)',
          '很高兴认识你！(Rất vui được gặp bạn!)',
        ],
        durationSeconds: 60,
        order: 4,
      },
    ],
    // --- Bài 2: Số đếm ---
    [
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"三十七" là số mấy?',
        options: ['73', '37', '33', '77'],
        answer: '1',
        order: 1,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'reading',
        prompt: '"星期五" là ngày nào trong tuần?',
        options: ['Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
        answer: '2',
        order: 2,
        shuffle: true,
      },
      {
        type: 'scramble',
        skill: 'reading',
        prompt: 'Sắp xếp lại các từ sau thành câu hoàn chỉnh:',
        answer: '今天 是 二零二六年 四月 十四号',
        order: 3,
      },
      {
        type: 'guided_writing',
        skill: 'writing',
        prompt: 'Viết 3–5 câu giới thiệu ngày sinh, tháng sinh và năm sinh của bạn bằng tiếng Trung.',
        keywords: ['生日', '年', '月', '号', '出生'],
        order: 4,
      },
    ],
    // --- Bài 3: Màu sắc và đồ vật ---
    [
      {
        type: 'mcq',
        skill: 'reading',
        prompt: '"红色" có nghĩa là màu gì?',
        options: ['Xanh lam', 'Vàng', 'Đỏ', 'Trắng'],
        answer: '2',
        order: 1,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'reading',
        prompt: 'Chọn đáp án ĐÚNG: "这是什么?" nghĩa là...',
        options: [
          'Đây là cái gì?',
          'Cái này bao nhiêu tiền?',
          'Bạn tên gì?',
          'Đây là của ai?',
        ],
        answer: '0',
        order: 2,
        shuffle: true,
      },
      {
        type: 'speaking_topic',
        skill: 'speaking',
        prompt: 'Mô tả căn phòng của bạn bằng tiếng Trung (ít nhất 5 đồ vật).',
        outline: [
          '我的房间里有... (Trong phòng tôi có...)',
          'Đề cập màu sắc của từng đồ vật',
          '我最喜欢... (Tôi thích nhất là...)',
        ],
        durationSeconds: 60,
        order: 3,
      },
      {
        type: 'guided_writing',
        skill: 'writing',
        prompt: 'Viết một đoạn văn ngắn mô tả đồ vật yêu thích của bạn.',
        keywords: ['颜色', '大小', '形状', '材料', '用途'],
        order: 4,
      },
    ],
  ],

  // ==========================================================================
  // Học phần 2
  // ==========================================================================
  [
    // --- Bài 1: Gia đình ---
    [
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"哥哥" có nghĩa là gì?',
        options: ['Em trai', 'Em gái', 'Anh trai', 'Chị gái'],
        answer: '2',
        order: 1,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'listening',
        prompt: 'Từ nào sau đây KHÔNG phải là từ chỉ thành viên gia đình?',
        options: ['妈妈', '爸爸', '朋友', '妹妹'],
        answer: '2',
        order: 2,
        shuffle: false,
      },
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"我家有四口人" nghĩa là gì?',
        options: [
          'Nhà tôi có bốn phòng',
          'Nhà tôi có bốn người',
          'Tôi có bốn anh chị em',
          'Gia đình tôi có bốn thế hệ',
        ],
        answer: '1',
        order: 3,
        shuffle: true,
      },
      {
        type: 'speaking_topic',
        skill: 'speaking',
        prompt: 'Giới thiệu về gia đình bạn: số thành viên, tên và nghề nghiệp của từng người.',
        outline: [
          '我家有...口人 (Gia đình tôi có... người)',
          'Giới thiệu từng thành viên: ...是我的...',
          '他/她的工作是... (Công việc của họ là...)',
        ],
        durationSeconds: 90,
        order: 4,
      },
      {
        type: 'guided_writing',
        skill: 'writing',
        prompt: 'Viết một đoạn giới thiệu về gia đình bạn (5–7 câu).',
        keywords: ['家庭', '父母', '兄弟姐妹', '工作', '爱好'],
        order: 5,
      },
    ],
    // --- Bài 2: Ẩm thực ---
    [
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"我想要一碗米饭" có nghĩa là gì?',
        options: [
          'Tôi muốn uống trà',
          'Tôi muốn một bát cơm',
          'Cho tôi xem thực đơn',
          'Bao nhiêu tiền?',
        ],
        answer: '1',
        order: 1,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'reading',
        prompt: 'Để hỏi "Cái này ngon không?", ta nói:',
        options: ['这个贵不贵?', '这个好吃吗?', '这个是什么?', '你喜欢吃什么?'],
        answer: '1',
        order: 2,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'reading',
        prompt: '"不辣" nghĩa là gì trong thực đơn?',
        options: ['Rất cay', 'Không cay', 'Hơi cay', 'Cực cay'],
        answer: '1',
        order: 3,
        shuffle: true,
      },
      {
        type: 'speaking_topic',
        skill: 'speaking',
        prompt: 'Đóng vai khách hàng và gọi món ăn tại nhà hàng Trung Quốc.',
        outline: [
          '服务员！(Phục vụ ơi!)',
          '我要... (Tôi muốn gọi...)',
          '这个辣吗? (Cái này có cay không?)',
          '买单！多少钱? (Tính tiền! Bao nhiêu tiền?)',
        ],
        durationSeconds: 90,
        order: 4,
      },
    ],
    // --- Bài 3: Đi lại ---
    [
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"地铁站在哪里?" có nghĩa là gì?',
        options: [
          'Xe buýt đi đến đâu?',
          'Ga tàu điện ngầm ở đâu?',
          'Bến xe ở đâu?',
          'Sân bay ở đâu?',
        ],
        answer: '1',
        order: 1,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'reading',
        prompt: 'Để đi "bằng xe buýt" ta dùng cách nói:',
        options: ['坐火车', '骑自行车', '坐公共汽车', '开车'],
        answer: '2',
        order: 2,
        shuffle: false,
      },
      {
        type: 'scramble',
        skill: 'reading',
        prompt: 'Sắp xếp thành câu hỏi đường hoàn chỉnh:',
        answer: '请问 火车站 怎么 走',
        order: 3,
      },
      {
        type: 'guided_writing',
        skill: 'writing',
        prompt: 'Viết hướng dẫn đường từ nhà bạn đến trường học (hoặc nơi làm việc) bằng tiếng Trung.',
        keywords: ['往左转', '往右转', '直走', '地铁', '公交车'],
        order: 4,
      },
    ],
  ],

  // ==========================================================================
  // Học phần 3
  // ==========================================================================
  [
    // --- Bài 1: Nghề nghiệp ---
    [
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"你的工作是什么?" là câu hỏi về:',
        options: ['Quê quán', 'Nghề nghiệp', 'Tuổi tác', 'Sở thích'],
        answer: '1',
        order: 1,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"程序员" có nghĩa là:',
        options: ['Bác sĩ', 'Giáo viên', 'Lập trình viên', 'Kế toán'],
        answer: '2',
        order: 2,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'listening',
        prompt: 'Đâu là câu nói phù hợp khi bắt đầu buổi họp?',
        options: [
          '我们开始吧！(Chúng ta bắt đầu thôi!)',
          '再见，明天见！(Tạm biệt, mai gặp!)',
          '你好，初次见面 (Xin chào, lần đầu gặp mặt)',
          '谢谢你的帮助 (Cảm ơn bạn đã giúp)',
        ],
        answer: '0',
        order: 3,
        shuffle: false,
      },
      {
        type: 'speaking_topic',
        skill: 'speaking',
        prompt: 'Giới thiệu công việc hiện tại hoặc công việc bạn mơ ước bằng tiếng Trung.',
        outline: [
          '我的职业是... (Nghề nghiệp của tôi là...)',
          '我在...公司工作 (Tôi làm ở công ty...)',
          '我的工作职责是... (Trách nhiệm công việc của tôi là...)',
          '我喜欢这份工作因为... (Tôi thích công việc này vì...)',
        ],
        durationSeconds: 90,
        order: 4,
      },
      {
        type: 'guided_writing',
        skill: 'writing',
        prompt:
          'Viết một email ngắn bằng tiếng Trung giới thiệu bản thân và kinh nghiệm làm việc của bạn (100–150 từ).',
        keywords: ['工作经验', '技能', '公司', '负责', '成就'],
        order: 5,
      },
    ],
    // --- Bài 2: Sức khoẻ ---
    [
      {
        type: 'mcq',
        skill: 'reading',
        prompt: '"我头疼" nghĩa là gì?',
        options: [
          'Tôi bị đau bụng',
          'Tôi bị đau đầu',
          'Tôi bị sốt',
          'Tôi bị mệt mỏi',
        ],
        answer: '1',
        order: 1,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'reading',
        prompt: 'Bác sĩ khuyên bạn "多喝水，多休息". Điều này có nghĩa là:',
        options: [
          'Uống nhiều thuốc và nghỉ ngơi',
          'Uống nhiều nước và nghỉ ngơi nhiều',
          'Ăn nhiều rau và đi bộ',
          'Tập thể dục và ăn đúng giờ',
        ],
        answer: '1',
        order: 2,
        shuffle: false,
      },
      {
        type: 'speaking_topic',
        skill: 'speaking',
        prompt: 'Đóng vai bệnh nhân, mô tả triệu chứng của mình cho bác sĩ nghe.',
        outline: [
          '我感觉不舒服，我... (Tôi cảm thấy không khỏe, tôi...)',
          '从...开始 (Bắt đầu từ...)',
          '有什么好的建议吗? (Có lời khuyên nào không?)',
        ],
        durationSeconds: 90,
        order: 3,
      },
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"我需要去医院检查一下" có nghĩa là:',
        options: [
          'Tôi cần đặt lịch hẹn với bác sĩ',
          'Tôi cần đến bệnh viện kiểm tra',
          'Tôi cần mua thuốc ở hiệu thuốc',
          'Tôi cần nghỉ ngơi ở nhà',
        ],
        answer: '1',
        order: 4,
        shuffle: true,
      },
    ],
    // --- Bài 3: Du lịch ---
    [
      {
        type: 'mcq',
        skill: 'reading',
        prompt: '"故宫" là tên của di tích nào nổi tiếng ở Trung Quốc?',
        options: [
          'Vạn Lý Trường Thành',
          'Tử Cấm Thành',
          'Đền Thiên Đàn',
          'Hồ Tây',
        ],
        answer: '1',
        order: 1,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'reading',
        prompt: 'Để đặt phòng khách sạn, ta nói:',
        options: [
          '我想预订一个房间 (Tôi muốn đặt một phòng)',
          '我想买一张机票 (Tôi muốn mua vé máy bay)',
          '我需要一张地图 (Tôi cần một tấm bản đồ)',
          '请给我推荐一个餐厅 (Hãy giới thiệu nhà hàng cho tôi)',
        ],
        answer: '0',
        order: 2,
        shuffle: false,
      },
      {
        type: 'scramble',
        skill: 'reading',
        prompt: 'Sắp xếp thành câu hỏi về du lịch hoàn chỉnh:',
        answer: '这个 景点 门票 多少 钱',
        order: 3,
      },
      {
        type: 'guided_writing',
        skill: 'writing',
        prompt: 'Viết một bài review ngắn về chuyến du lịch mà bạn ấn tượng nhất (100–150 từ).',
        keywords: ['旅游', '景点', '文化', '美食', '印象深刻'],
        order: 4,
      },
      {
        type: 'speaking_topic',
        skill: 'speaking',
        prompt: 'Mô tả kế hoạch du lịch lý tưởng của bạn đến Trung Quốc.',
        outline: [
          '我想去... (Tôi muốn đi...)',
          '我打算参观... (Tôi dự định tham quan...)',
          '我想尝试当地美食，比如... (Tôi muốn thử ẩm thực địa phương, ví dụ...)',
          '这次旅行对我的意义是... (Chuyến đi này có ý nghĩa với tôi vì...)',
        ],
        durationSeconds: 120,
        order: 5,
      },
    ],
  ],

  // ==========================================================================
  // Học phần 4
  // ==========================================================================
  [
    // --- Bài 1: Thành ngữ ---
    [
      {
        type: 'mcq',
        skill: 'reading',
        prompt: 'Thành ngữ "半途而废" có nghĩa là:',
        options: [
          'Làm việc đến cùng, không bỏ cuộc',
          'Bỏ dở giữa chừng, không hoàn thành',
          'Làm nhiều việc cùng lúc',
          'Bắt đầu mà không có kế hoạch',
        ],
        answer: '1',
        order: 1,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'reading',
        prompt: '"一石二鸟" tương đương thành ngữ tiếng Việt nào?',
        options: [
          'Chậm mà chắc',
          'Một mũi tên trúng hai đích',
          'Có công mài sắt có ngày nên kim',
          'Đầu voi đuôi chuột',
        ],
        answer: '1',
        order: 2,
        shuffle: true,
      },
      {
        type: 'speaking_topic',
        skill: 'speaking',
        prompt:
          'Chọn một thành ngữ tiếng Trung bạn yêu thích, giải thích ý nghĩa và kể một ví dụ thực tế.',
        outline: [
          '我最喜欢的成语是... (Thành ngữ tôi thích nhất là...)',
          '它的意思是... (Ý nghĩa của nó là...)',
          '举个例子... (Ví dụ như...)',
          '在我的生活中... (Trong cuộc sống của tôi...)',
        ],
        durationSeconds: 120,
        order: 3,
      },
      {
        type: 'guided_writing',
        skill: 'writing',
        prompt:
          'Viết một đoạn văn (150–200 từ) giải thích nguồn gốc và ý nghĩa của một thành ngữ Trung Quốc bạn biết.',
        keywords: ['成语', '典故', '含义', '比喻', '现实意义'],
        order: 4,
      },
    ],
    // --- Bài 2: Lịch sử ---
    [
      {
        type: 'mcq',
        skill: 'reading',
        prompt: '"丝绸之路" (Con đường tơ lụa) kết nối Trung Quốc với:',
        options: [
          'Nhật Bản và Hàn Quốc',
          'Trung Đông, Châu Á và Châu Âu',
          'Châu Phi và Châu Mỹ',
          'Đông Nam Á và Ấn Độ',
        ],
        answer: '1',
        order: 1,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'reading',
        prompt: '"四大发明" (Bốn phát minh vĩ đại) của Trung Quốc bao gồm:',
        options: [
          'Lửa, bánh xe, nông nghiệp, chữ viết',
          'Giấy, in ấn, thuốc súng, la bàn',
          'Sắt, đồng, gốm sứ, lụa',
          'Thiên văn học, toán học, y học, âm nhạc',
        ],
        answer: '1',
        order: 2,
        shuffle: true,
      },
      {
        type: 'guided_writing',
        skill: 'writing',
        prompt:
          'Viết một bài luận ngắn (150–200 từ) về một sự kiện lịch sử Trung Quốc mà bạn thấy có ảnh hưởng quan trọng đến thế giới.',
        keywords: ['历史', '朝代', '文化', '影响', '意义'],
        order: 3,
      },
      {
        type: 'mcq',
        skill: 'listening',
        prompt: 'Triều đại nào xây dựng phần lớn Vạn Lý Trường Thành như hiện nay?',
        options: ['Nhà Hán', 'Nhà Tần', 'Nhà Minh', 'Nhà Đường'],
        answer: '2',
        order: 4,
        shuffle: true,
      },
    ],
    // --- Bài 3: Thời sự ---
    [
      {
        type: 'mcq',
        skill: 'reading',
        prompt: '"可持续发展" có nghĩa là:',
        options: [
          'Phát triển kinh tế nhanh chóng',
          'Phát triển bền vững',
          'Phát triển công nghệ số',
          'Phát triển cơ sở hạ tầng',
        ],
        answer: '1',
        order: 1,
        shuffle: true,
      },
      {
        type: 'mcq',
        skill: 'reading',
        prompt: 'Đọc đoạn văn: "随着科技的发展，人工智能已经渗透到我们生活的方方面面。" — Đoạn văn này nói về:',
        options: [
          'Ảnh hưởng của AI đến cuộc sống hiện đại',
          'Sự phát triển của internet',
          'Tác động của biến đổi khí hậu',
          'Xu hướng học tập trực tuyến',
        ],
        answer: '0',
        order: 2,
        shuffle: false,
      },
      {
        type: 'speaking_topic',
        skill: 'speaking',
        prompt: 'Trình bày quan điểm của bạn về tác động của mạng xã hội đối với giới trẻ.',
        outline: [
          '我认为社交媒体对年轻人... (Tôi cho rằng mạng xã hội đối với người trẻ...)',
          '一方面... 另一方面... (Một mặt... Mặt khác...)',
          '解决方案是... (Giải pháp là...)',
          '总而言之... (Tóm lại...)',
        ],
        durationSeconds: 150,
        order: 3,
      },
      {
        type: 'guided_writing',
        skill: 'writing',
        prompt:
          'Viết bài luận tranh luận (200–250 từ): "Công nghệ trí tuệ nhân tạo — cơ hội hay thách thức cho giáo dục?" bằng tiếng Trung.',
        keywords: ['人工智能', '教育', '机遇', '挑战', '未来'],
        order: 4,
      },
      {
        type: 'mcq',
        skill: 'listening',
        prompt: '"环境保护" đề cập đến vấn đề gì?',
        options: [
          'Bảo vệ văn hóa truyền thống',
          'Bảo vệ môi trường',
          'Bảo vệ động vật hoang dã',
          'Bảo vệ quyền trẻ em',
        ],
        answer: '1',
        order: 5,
        shuffle: true,
      },
    ],
  ],
];

// ---- News ----
const NEWS_LIST = [
  {
    title: 'HÁN NGỮ KÝ ra mắt 4 học phần mới theo chuẩn HSK',
    content:
      'Chúng tôi vui mừng thông báo hệ thống đã được cập nhật với 4 học phần mới được thiết kế theo chuẩn HSK từ cấp độ nhập môn đến nâng cao.\n\nMỗi học phần bao gồm các bài tập đa dạng: nghe, nói, đọc, viết với nội dung phong phú về văn hoá và ngôn ngữ Trung Quốc. Người dùng có thể theo dõi tiến trình học và luyện tập thi thử qua module Thi thử mới.',
    publishedAt: new Date('2026-04-14'),
  },
  {
    title: 'Mẹo học thành ngữ tiếng Trung hiệu quả cho người Việt',
    content:
      'Thành ngữ tiếng Trung (成语) là phần thử thách nhưng cũng thú vị nhất khi học tiếng Trung. Bài viết này tổng hợp 5 phương pháp đã được kiểm chứng:\n\n1. Học qua câu chuyện nguồn gốc — Mỗi thành ngữ đều có điển tích riêng\n2. Liên kết với thành ngữ Việt tương đương\n3. Dùng flashcard kết hợp ứng dụng SRS\n4. Luyện viết câu ví dụ trong ngữ cảnh thực tế\n5. Xem phim lịch sử Trung Quốc có phụ đề',
    publishedAt: new Date('2026-04-05'),
  },
  {
    title: 'Khoá học đọc hiểu văn học cổ điển Trung Quốc mở đăng ký',
    content:
      'Dành cho người học đã đạt trình độ HSK 4 trở lên, khoá học mới tập trung vào đọc hiểu các tác phẩm kinh điển như "Hồng Lâu Mộng", "Tam Quốc Chí" và "Tây Du Ký".\n\nKhoá học giúp bạn nắm vững văn phong cổ điển, mở rộng vốn từ học thuật và hiểu sâu hơn về văn hoá, lịch sử Trung Hoa qua từng trang sách.',
    publishedAt: new Date('2026-04-01'),
  },
  {
    title: 'Tầm quan trọng của việc luyện phát âm thanh điệu từ đầu',
    content:
      'Tiếng Trung là ngôn ngữ có thanh điệu, và đây chính là rào cản lớn nhất với người học Việt. Bài viết phân tích các lỗi thanh điệu phổ biến nhất mà người Việt hay mắc phải và cách khắc phục hiệu quả.\n\nĐặc biệt, chúng tôi giới thiệu phương pháp "shadowing" — bắt chước theo người bản ngữ — được nhiều giáo viên tiếng Trung khuyến khích áp dụng ngay từ những tuần đầu học.',
    publishedAt: new Date('2026-03-20'),
  },
];

// ---- Exams (legacy) ----
const EXAMS = [
  {
    title: 'Đề thi thử tổng hợp — Học phần 1 & 2',
    timeLimitSeconds: 2700,
  },
];

// ---- Mock tests (one per Học phần — IDs resolved at runtime from exercise pool) ----
const MOCK_TEST_TEMPLATES = [
  {
    hocPhan: 1,
    title: 'Thi thử Học phần 1 — Đề số 1',
    description:
      'Đề thi thử tổng hợp 4 kỹ năng Nghe–Nói–Đọc–Viết dành cho Học phần 1. Thời gian làm bài: 30 phút.',
    timeLimitSeconds: 1800,
  },
  {
    hocPhan: 2,
    title: 'Thi thử Học phần 2 — Đề số 1',
    description:
      'Kiểm tra khả năng giao tiếp hàng ngày qua 4 kỹ năng. Bao gồm các chủ đề gia đình, ẩm thực và đi lại. Thời gian: 35 phút.',
    timeLimitSeconds: 2100,
  },
  {
    hocPhan: 3,
    title: 'Thi thử Học phần 3 — Đề số 1',
    description:
      'Đề thi thử trung cấp bao gồm các tình huống nghề nghiệp, sức khoẻ và du lịch. Thời gian: 40 phút.',
    timeLimitSeconds: 2400,
  },
  {
    hocPhan: 4,
    title: 'Thi thử Học phần 4 — Đề số 1',
    description:
      'Đề thi thử nâng cao: thành ngữ, lịch sử và phân tích thời sự. Yêu cầu viết luận ngắn. Thời gian: 45 phút.',
    timeLimitSeconds: 2700,
  },
];

// =============================================================================
// MAIN SEED
// =============================================================================
async function seed() {
  console.log('Connecting to Firebase project:', firebaseConfig.projectId);
  console.log('Starting seed...\n');

  // 1. Clear existing data
  console.log('Clearing existing collections...');
  await clearCourses();
  await clearCollection('exercises');
  await clearCollection('news');
  await clearCollection('exams');
  console.log();

  // 2. Seed courses, lessons, exercises
  const courseIds = [];
  const allExerciseIds = { listening: [], speaking: [], reading: [], writing: [] };

  for (let ci = 0; ci < COURSES.length; ci++) {
    const courseId = await add('courses', COURSES[ci]);
    courseIds.push(courseId);
    console.log(`Created course [HP${COURSES[ci].order}]: ${COURSES[ci].title} (${courseId})`);

    const lessonDefs = LESSONS[ci] ?? [];
    for (let li = 0; li < lessonDefs.length; li++) {
      const lessonId = await add(`courses/${courseId}/lessons`, lessonDefs[li]);
      console.log(`  Lesson [${li + 1}]: ${lessonDefs[li].title} (${lessonId})`);

      const exerciseDefs = EXERCISES[ci]?.[li] ?? [];
      for (const ex of exerciseDefs) {
        const enriched = { ...ex, courseId, lessonId };
        const exId = await addExercise(
          `courses/${courseId}/lessons/${lessonId}/exercises`,
          enriched
        );
        const skill = ex.skill;
        if (allExerciseIds[skill]) allExerciseIds[skill].push(exId);
        console.log(`    [${ex.skill}/${ex.type}] ${ex.prompt.slice(0, 50)}...`);
      }
    }
  }

  // 3. Seed news
  console.log('\nSeeding news...');
  for (const n of NEWS_LIST) {
    const id = await add('news', n);
    console.log(`  ${n.title.slice(0, 60)} (${id})`);
  }

  // 4. Seed legacy exam
  console.log('\nSeeding exams...');
  for (const exam of EXAMS) {
    const id = await add('exams', {
      ...exam,
      sections: allExerciseIds,
    });
    console.log(`  ${exam.title} (${id})`);
  }

  // 5. Seed mock tests (group exercise IDs per Học phần)
  console.log('\nSeeding mock tests...');
  await clearCollection('mockTests');

  // Build per-hocPhan exercise pools by collecting IDs from each course's exercises
  const hocPhanExerciseIds = { 1: {}, 2: {}, 3: {}, 4: {} };
  for (let ci = 0; ci < COURSES.length; ci++) {
    const hp = COURSES[ci].order;
    const pool = { listening: [], speaking: [], reading: [], writing: [] };
    const courseId = courseIds[ci];
    const lessonsSnap = await getDocs(collection(db, `courses/${courseId}/lessons`));
    for (const lessonDoc of lessonsSnap.docs) {
      const exSnap = await getDocs(
        collection(db, `courses/${courseId}/lessons/${lessonDoc.id}/exercises`)
      );
      for (const exDoc of exSnap.docs) {
        const skill = exDoc.data().skill;
        if (pool[skill]) pool[skill].push(exDoc.id);
      }
    }
    hocPhanExerciseIds[hp] = pool;
  }

  for (const template of MOCK_TEST_TEMPLATES) {
    const pool = hocPhanExerciseIds[template.hocPhan];
    const sections = {
      listening: pool.listening ?? [],
      speaking: pool.speaking ?? [],
      reading: pool.reading ?? [],
      writing: pool.writing ?? [],
    };
    const id = await add('mockTests', {
      title: template.title,
      description: template.description,
      hocPhan: template.hocPhan,
      timeLimitSeconds: template.timeLimitSeconds,
      sections,
    });
    const total = Object.values(sections).reduce((s, arr) => s + arr.length, 0);
    console.log(
      `  HP${template.hocPhan}: "${template.title}" — ${total} exercises, ` +
      `${template.timeLimitSeconds / 60} min (${id})`
    );
  }

  // Summary
  const totalLessons = LESSONS.reduce((s, l) => s + l.length, 0);
  const totalExercises = EXERCISES.reduce((s, c) => s + c.reduce((ls, l) => ls + l.length, 0), 0);

  console.log('\n=== Seed complete! ===');
  console.log(`  Học phần: ${COURSES.length}`);
  console.log(`  Lessons:  ${totalLessons}`);
  console.log(`  Exercises: ${totalExercises}`);
  console.log(`  News:     ${NEWS_LIST.length}`);
  console.log(`  Exams:    ${EXAMS.length}`);
  console.log(`  Mock tests: ${MOCK_TEST_TEMPLATES.length}`);
  console.log('\nYou can now open the app and see the new data!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
