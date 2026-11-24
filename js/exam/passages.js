// [Cần duyệt] Kho đoạn văn đọc hiểu HSK 1–9 do hệ thống biên soạn, cần giáo viên duyệt ngữ pháp và độ khó trước khi dùng chính thức.
export const READING_PASSAGES = [
  {
    id: 'p_hsk1_01',
    level: 1,
    needsReview: true,
    title: '周末去商店买水果',
    paragraphs: [
      [
        { zh: '今天', py: 'jīntiān' },
        { zh: '是', py: 'shì' },
        { zh: '星期六', py: 'xīngqīliù' },
        { zh: '，', py: '' },
        { zh: '天气', py: 'tiānqì' },
        { zh: '很', py: 'hěn' },
        { zh: '好', py: 'hǎo' },
        { zh: '。', py: '' },
        { zh: '上午', py: 'shàngwǔ' },
        { zh: '九点', py: 'jiǔ diǎn' },
        { zh: '，', py: '' },
        { zh: '王明', py: 'Wáng Míng' },
        { zh: '和', py: 'hé' },
        { zh: '妈妈', py: 'māma' },
        { zh: '一起', py: 'yìqǐ' },
        { zh: '去', py: 'qù' },
        { zh: '商店', py: 'shāngdiàn' },
        { zh: '买', py: 'mǎi' },
        { zh: '水果', py: 'shuǐguǒ' },
        { zh: '。', py: '' }
      ],
      [
        { zh: '商店', py: 'shāngdiàn' },
        { zh: '里', py: 'lǐ' },
        { zh: '的', py: 'de' },
        { zh: '苹果', py: 'píngguǒ' },
        { zh: '很', py: 'hěn' },
        { zh: '大', py: 'dà' },
        { zh: '，', py: '' },
        { zh: '也', py: 'yě' },
        { zh: '很', py: 'hěn' },
        { zh: '便宜', py: 'piányi' },
        { zh: '。', py: '' },
        { zh: '他们', py: 'tāmen' },
        { zh: '买', py: 'mǎi' },
        { zh: '了', py: 'le' },
        { zh: '五个', py: 'wǔ gè' },
        { zh: '苹果', py: 'píngguǒ' },
        { zh: '和', py: 'hé' },
        { zh: '三杯', py: 'sān bēi' },
        { zh: '牛奶', py: 'niúnǎi' },
        { zh: '。', py: '' },
        { zh: '中午', py: 'zhōngwǔ' },
        { zh: '十一点半', py: 'shíyī diǎn bàn' },
        { zh: '，', py: '' },
        { zh: '他们', py: 'tāmen' },
        { zh: '高高兴兴', py: 'gāogāoxìngxìng' },
        { zh: '地', py: 'de' },
        { zh: '回家', py: 'huí jiā' },
        { zh: '做饭', py: 'zuò fàn' },
        { zh: '。', py: '' }
      ]
    ],
    questions: [
      {
        stem: '这段话主要讲了什么？',
        options: ['王明和妈妈星期六上午去商店买东西', '王明在学校学习做饭', '妈妈一个人在家喝牛奶', '星期天商店里没有水果'],
        correctIndexes: [0],
        explanation: 'Ý chính: Sáng thứ Bảy, Vương Minh và mẹ cùng đi cửa hàng mua hoa quả và sữa.'
      },
      {
        stem: '王明和妈妈在商店买了什么？',
        options: ['五个苹果和三杯牛奶', '三斤米饭和五个鸡蛋', '两杯茶和一本书', '四件衣服和一块表'],
        correctIndexes: [0],
        explanation: 'Chi tiết ở đoạn 2: 他们买了五个苹果和三杯牛奶。'
      },
      {
        stem: '文中“高高兴兴”的意思是什么？',
        options: ['非常开心、愉快', '很生气、不满意', '非常累、想睡觉', '很着急、害怕'],
        correctIndexes: [0],
        explanation: 'Nghĩa trong ngữ cảnh: “高高兴兴地回家” là vui vẻ trở về nhà.'
      },
      {
        stem: '从文中可以知道什么？',
        options: ['他们中午十一点半左右回到家', '今天下雨，天气很冷', '商店里的苹果非常贵', '王明下午才去商店'],
        correctIndexes: [0],
        explanation: 'Suy luận từ câu cuối: 中午十一点半，他们高高兴兴地回家做饭。'
      }
    ]
  },
  {
    id: 'p_hsk2_01',
    level: 2,
    needsReview: true,
    title: '每天早上跑步锻炼',
    paragraphs: [
      [
        { zh: '李老师', py: 'Lǐ lǎoshī' },
        { zh: '非常', py: 'fēicháng' },
        { zh: '喜欢', py: 'xǐhuan' },
        { zh: '运动', py: 'yùndòng' },
        { zh: '。', py: '' },
        { zh: '每天', py: 'měitiān' },
        { zh: '早上', py: 'zǎoshang' },
        { zh: '六点半', py: 'liù diǎn bàn' },
        { zh: '，', py: '' },
        { zh: '他', py: 'tā' },
        { zh: '都', py: 'dōu' },
        { zh: '去', py: 'qù' },
        { zh: '学校', py: 'xuéxiào' },
        { zh: '旁边', py: 'pángbiān' },
        { zh: '的', py: 'de' },
        { zh: '公园', py: 'gōngyuán' },
        { zh: '跑步', py: 'pǎobù' },
        { zh: '。', py: '' }
      ],
      [
        { zh: '公园', py: 'gōngyuán' },
        { zh: '里', py: 'lǐ' },
        { zh: '有', py: 'yǒu' },
        { zh: '很多', py: 'hěnduō' },
        { zh: '树', py: 'shù' },
        { zh: '，', py: '' },
        { zh: '空气', py: 'kōngqì' },
        { zh: '特别', py: 'tèbié' },
        { zh: '新鲜', py: 'xīnxiān' },
        { zh: '。', py: '' },
        { zh: '跑完步', py: 'pǎo wán bù' },
        { zh: '以后', py: 'yǐhòu' },
        { zh: '，', py: '' },
        { zh: '他', py: 'tā' },
        { zh: '去', py: 'qù' },
        { zh: '食堂', py: 'shítáng' },
        { zh: '吃', py: 'chī' },
        { zh: '早饭', py: 'zǎofàn' },
        { zh: '，', py: '' },
        { zh: '然后', py: 'ránhòu' },
        { zh: '开始', py: 'kāishǐ' },
        { zh: '准备', py: 'zhǔnbèi' },
        { zh: '八点', py: 'bā diǎn' },
        { zh: '的', py: 'de' },
        { zh: '汉语课', py: 'Hànyǔ kè' },
        { zh: '。', py: '' }
      ]
    ],
    questions: [
      {
        stem: '这段短文主要介绍了李老师的什么习惯？',
        options: ['每天早上跑步锻炼并准时备课', '晚上在图书馆看电影', '周末去外地旅游', '每天下午在教室睡觉'],
        correctIndexes: [0],
        explanation: 'Ý chính: Thói quen chạy bộ buổi sáng ở công viên và ăn sáng, chuẩn bị dạy tiếng Hán của thầy Lý.'
      },
      {
        stem: '李老师每天早上在哪里跑步？',
        options: ['学校旁边的公园', '教室里面', '火车站前面', '医院后面'],
        correctIndexes: [0],
        explanation: 'Chi tiết đoạn 1: 他都去学校旁边的公园跑步。'
      },
      {
        stem: '文中“新鲜”用来形容什么？',
        options: ['公园里的空气', '食堂里的报纸', '教室里的桌子', '商店里的手机'],
        correctIndexes: [0],
        explanation: 'Nghĩa ngữ cảnh: 公园里有很多树，空气特别新鲜 (không khí trong lành).'
      },
      {
        stem: '从文中可以推断出李老师的职业是什么？',
        options: ['教汉语的老师', '医院的医生', '商店的售货员', '出租车司机'],
        correctIndexes: [0],
        explanation: 'Suy luận từ tên gọi 李老师 và chi tiết 准备八点的汉语课.'
      }
    ]
  },
  {
    id: 'p_hsk3_01',
    level: 3,
    needsReview: true,
    title: '骑自行车上班的好处',
    paragraphs: [
      [
        { zh: '以前', py: 'yǐqián' },
        { zh: '小张', py: 'Xiǎo Zhāng' },
        { zh: '每天', py: 'měitiān' },
        { zh: '开车', py: 'kāichē' },
        { zh: '去', py: 'qù' },
        { zh: '公司', py: 'gōngsī' },
        { zh: '，', py: '' },
        { zh: '但是', py: 'dànshì' },
        { zh: '早上', py: 'zǎoshang' },
        { zh: '路上', py: 'lùshang' },
        { zh: '经常', py: 'jīngcháng' },
        { zh: '堵车', py: 'dǔchē' },
        { zh: '，', py: '' },
        { zh: '他', py: 'tā' },
        { zh: '差不多', py: 'chàbuduō' },
        { zh: '要', py: 'yào' },
        { zh: '花', py: 'huā' },
        { zh: '一个小时', py: 'yí gè xiǎoshí' },
        { zh: '才能', py: 'cáinéng' },
        { zh: '到', py: 'dào' },
        { zh: '。', py: '' }
      ],
      [
        { zh: '上个月', py: 'shàng gè yuè' },
        { zh: '，', py: '' },
        { zh: '他', py: 'tā' },
        { zh: '决定', py: 'juédìng' },
        { zh: '改骑', py: 'gǎi qí' },
        { zh: '自行车', py: 'zìxíngchē' },
        { zh: '上班', py: 'shàngbān' },
        { zh: '。', py: '' },
        { zh: '现在', py: 'xiànzài' },
        { zh: '他', py: 'tā' },
        { zh: '只要', py: 'zhǐyào' },
        { zh: '二十五分钟', py: 'èrshíwǔ fēnzhōng' },
        { zh: '就', py: 'jiù' },
        { zh: '能', py: 'néng' },
        { zh: '到', py: 'dào' },
        { zh: '公司', py: 'gōngsī' },
        { zh: '，', py: '' },
        { zh: '既', py: 'jì' },
        { zh: '节约', py: 'jiéyuē' },
        { zh: '了', py: 'le' },
        { zh: '时间', py: 'shíjiān' },
        { zh: '，', py: '' },
        { zh: '又', py: 'yòu' },
        { zh: '锻炼', py: 'duànliàn' },
        { zh: '了', py: 'le' },
        { zh: '身体', py: 'shēntǐ' },
        { zh: '。', py: '' }
      ]
    ],
    questions: [
      {
        stem: '这段话主要讲了什么？',
        options: ['小张改骑自行车上班后带来的好处', '如何维修旧自行车', '购买新车需要注意的问题', '公司要求员工提前一小时上班'],
        correctIndexes: [0],
        explanation: 'Ý chính: Tiểu Trương chuyển sang đạp xe đi làm giúp tiết kiệm thời gian và rèn luyện sức khỏe.'
      },
      {
        stem: '小张以前为什么上班要花一个小时？',
        options: ['因为早上路上经常堵车', '因为公司离家五百公里', '因为他每天走路去公司', '因为他要先送孩子去外地'],
        correctIndexes: [0],
        explanation: 'Chi tiết đoạn 1: 早上路上经常堵车，他差不多要花一个小时才能到。'
      },
      {
        stem: '文中“节约”的意思最接近下列哪一项？',
        options: ['节省、不浪费', '增加、延长', '忘记、丢失', '借给别人'],
        correctIndexes: [0],
        explanation: 'Nghĩa ngữ cảnh: “节约了时间” nghĩa là tiết kiệm được thời gian.'
      },
      {
        stem: '根据短文，骑自行车上班有哪些好处？（请选择2个正确答案）',
        options: ['节约了时间', '锻炼了身体', '公司每个月发双倍工资', '不需要按时上班了'],
        correctIndexes: [0, 1],
        explanation: 'Câu cuối: 既节约了时间，又锻炼了身体。'
      }
    ]
  },
  {
    id: 'p_hsk4_01',
    level: 4,
    needsReview: true,
    title: '阅读纸质书与电子书',
    paragraphs: [
      [
        { zh: '随着', py: 'suízhe' },
        { zh: '手机', py: 'shǒujī' },
        { zh: '和', py: 'hé' },
        { zh: '平板电脑', py: 'píngbǎn diànnǎo' },
        { zh: '的', py: 'de' },
        { zh: '普及', py: 'pǔjí' },
        { zh: '，', py: '' },
        { zh: '越来越多', py: 'yuèláiyuè duō' },
        { zh: '的', py: 'de' },
        { zh: '年轻人', py: 'niánqīngrén' },
        { zh: '习惯', py: 'xíguàn' },
        { zh: '在', py: 'zài' },
        { zh: '网上', py: 'wǎngshàng' },
        { zh: '阅读', py: 'yuèdú' },
        { zh: '电子书', py: 'diànzǐshū' },
        { zh: '。', py: '' },
        { zh: '电子书', py: 'diànzǐshū' },
        { zh: '不仅', py: 'bùjǐn' },
        { zh: '携带', py: 'xiédài' },
        { zh: '方便', py: 'fāngbiàn' },
        { zh: '，', py: '' },
        { zh: '而且', py: 'érqiě' },
        { zh: '价格', py: 'jiàgé' },
        { zh: '通常', py: 'tōngcháng' },
        { zh: '比', py: 'bǐ' },
        { zh: '纸质书', py: 'zhǐzhìshū' },
        { zh: '便宜', py: 'piányi' },
        { zh: '。', py: '' }
      ],
      [
        { zh: '不过', py: 'búguò' },
        { zh: '，', py: '' },
        { zh: '仍然', py: 'réngrán' },
        { zh: '有', py: 'yǒu' },
        { zh: '不少人', py: 'bùshǎo rén' },
        { zh: '更', py: 'gèng' },
        { zh: '喜欢', py: 'xǐhuan' },
        { zh: '纸质书', py: 'zhǐzhìshū' },
        { zh: '。', py: '' },
        { zh: '他们', py: 'tāmen' },
        { zh: '认为', py: 'rènwéi' },
        { zh: '翻阅', py: 'fānyuè' },
        { zh: '纸张', py: 'zhǐzhāng' },
        { zh: '更有', py: 'gèng yǒu' },
        { zh: '阅读', py: 'yuèdú' },
        { zh: '的', py: 'de' },
        { zh: '氛围', py: 'fēnwéi' },
        { zh: '，', py: '' },
        { zh: '也', py: 'yě' },
        { zh: '不容易', py: 'bù róngyì' },
        { zh: '让', py: 'ràng' },
        { zh: '眼睛', py: 'yǎnjing' },
        { zh: '感到', py: 'gǎndào' },
        { zh: '疲劳', py: 'píláo' },
        { zh: '。', py: '' }
      ]
    ],
    questions: [
      {
        stem: '这段短文主要讨论了什么主题？',
        options: ['电子书与纸质书各自的优势与读者偏好', '手机和平板电脑的硬件维修方法', '传统书店如何降低印刷成本', '年轻人每天使用手机的时长限制'],
        correctIndexes: [0],
        explanation: 'Ý chính: So sánh ưu điểm của sách điện tử và sách giấy cùng lựa chọn của người đọc.'
      },
      {
        stem: '文中“普及”最接近下列哪个意思？',
        options: ['普遍推广、大众广泛使用', '价格变得非常昂贵', '完全停止生产和销售', '只有少数专业人士了解'],
        correctIndexes: [0],
        explanation: 'Nghĩa ngữ cảnh: “普及” là phổ cập, được sử dụng rộng rãi.'
      },
      {
        stem: '人们更喜欢纸质书的原因有哪些？（请选择2个正确答案）',
        options: ['更有阅读的氛围', '不容易让眼睛感到疲劳', '可以自动朗读所有外语文章', '不需要任何空间存放'],
        correctIndexes: [0, 1],
        explanation: 'Chi tiết đoạn 2: 更有阅读的氛围 và 不容易让眼睛感到疲劳。'
      },
      {
        stem: '从文中可以推断出什么？',
        options: ['纸质书并没有因为电子书的出现而完全被取代', '所有人都已经放弃阅读纸质书', '电子书的价格比纸质书贵得多', '阅读纸质书比看电子书更容易伤眼睛'],
        correctIndexes: [0],
        explanation: 'Suy luận từ câu “仍然有不少人更喜欢纸质书”.'
      }
    ]
  },
  {
    id: 'p_hsk5_01',
    level: 5,
    needsReview: true,
    title: '城市绿化与居民生活质量',
    paragraphs: [
      [
        { zh: '近年来', py: 'jìnniánlái' },
        { zh: '，', py: '' },
        { zh: '许多', py: 'xǔduō' },
        { zh: '大城市', py: 'dà chéngshì' },
        { zh: '在', py: 'zài' },
        { zh: '发展', py: 'fāzhǎn' },
        { zh: '经济', py: 'jīngjì' },
        { zh: '的', py: 'de' },
        { zh: '同时', py: 'tóngshí' },
        { zh: '，', py: '' },
        { zh: '越来越', py: 'yuèláiyuè' },
        { zh: '重视', py: 'zhòngshì' },
        { zh: '生态', py: 'shēngtài' },
        { zh: '环境', py: 'huánjìng' },
        { zh: '建设', py: 'jiànshè' },
        { zh: '。', py: '' },
        { zh: '社区', py: 'shèqū' },
        { zh: '周边', py: 'zhōubiān' },
        { zh: '新建', py: 'xīnjiàn' },
        { zh: '了', py: 'le' },
        { zh: '不少', py: 'bùshǎo' },
        { zh: '口袋公园', py: 'kǒudài gōngyuán' },
        { zh: '和', py: 'hé' },
        { zh: '步行', py: 'bùxíng' },
        { zh: '绿道', py: 'lǜdào' },
        { zh: '。', py: '' }
      ],
      [
        { zh: '这些', py: 'zhèxiē' },
        { zh: '绿色', py: 'lǜsè' },
        { zh: '空间', py: 'kōngjiān' },
        { zh: '不仅', py: 'bùjǐn' },
        { zh: '改善', py: 'gǎishàn' },
        { zh: '了', py: 'le' },
        { zh: '局部', py: 'júbù' },
        { zh: '气候', py: 'qìhòu' },
        { zh: '与', py: 'yǔ' },
        { zh: '空气', py: 'kōngqì' },
        { zh: '质量', py: 'zhìliàng' },
        { zh: '，', py: '' },
        { zh: '也', py: 'yě' },
        { zh: '为', py: 'wèi' },
        { zh: '忙碌', py: 'mánglù' },
        { zh: '的', py: 'de' },
        { zh: '都市人', py: 'dūshìrén' },
        { zh: '提供', py: 'tígōng' },
        { zh: '了', py: 'le' },
        { zh: '放松', py: 'fàngsōng' },
        { zh: '身心', py: 'shēnxīn' },
        { zh: '、', py: '' },
        { zh: '增进', py: 'zēngjìn' },
        { zh: '邻里', py: 'línlǐ' },
        { zh: '交流', py: 'jiāoliú' },
        { zh: '的', py: 'de' },
        { zh: '场所', py: 'chǎngsuǒ' },
        { zh: '。', py: '' }
      ]
    ],
    questions: [
      {
        stem: '这篇文章的核心主旨是什么？',
        options: ['城市绿色空间建设改善了生态并提升了居民生活品质', '大城市应该停止经济建设以保护森林', '社区周边不再适合建造商业设施', '都市人普遍缺乏足够的睡眠时间'],
        correctIndexes: [0],
        explanation: 'Ý chính: Việc xây dựng công viên bỏ túi và đường xanh đô thị vừa cải thiện môi trường vừa nâng cao chất lượng sống cư dân.'
      },
      {
        stem: '文中“增进”的意思最接近于：',
        options: ['促进、加深', '削弱、减少', '推迟、取消', '模仿、复制'],
        correctIndexes: [0],
        explanation: 'Nghĩa ngữ cảnh: “增进邻里交流” là thúc đẩy, tăng cường sự giao lưu giữa láng giềng.'
      },
      {
        stem: '新建的绿色空间带来了哪些积极影响？（请选择2个正确答案）',
        options: ['改善局部气候与空气质量', '提供放松身心与邻里交流的场所', '彻底消除了城市所有交通噪声', '大幅降低了居民的住房贷款利率'],
        correctIndexes: [0, 1],
        explanation: 'Chi tiết đoạn 2 nêu hai lợi ích rõ rệt của không gian xanh.'
      },
      {
        stem: '从文中可以推断出什么？',
        options: ['现代城市规划正努力实现经济与生态的协调发展', '大城市已经完全放弃了经济增长目标', '居民不喜欢在居住区附近散步休息', '步行绿道只允许机动车通行'],
        correctIndexes: [0],
        explanation: 'Suy luận từ câu mở đầu: 在发展经济的同时，越来越重视生态环境建设。'
      }
    ]
  },
  {
    id: 'p_hsk6_01',
    level: 6,
    needsReview: true,
    title: '非物质文化遗产的活态传承',
    paragraphs: [
      [
        { zh: '非物质文化遗产', py: 'fēiwùzhì wénhuà yíchǎn' },
        { zh: '承载', py: 'chéngzài' },
        { zh: '着', py: 'zhe' },
        { zh: '一个', py: 'yí gè' },
        { zh: '民族', py: 'mínzú' },
        { zh: '的', py: 'de' },
        { zh: '历史', py: 'lìshǐ' },
        { zh: '记忆', py: 'jìyì' },
        { zh: '与', py: 'yǔ' },
        { zh: '审美', py: 'shěnměi' },
        { zh: '智慧', py: 'zhìhuì' },
        { zh: '。', py: '' },
        { zh: '然而', py: 'rán’ér' },
        { zh: '，', py: '' },
        { zh: '单纯', py: 'dānchún' },
        { zh: '将', py: 'jiāng' },
        { zh: '传统', py: 'chuántǒng' },
        { zh: '技艺', py: 'jìyì' },
        { zh: '陈列', py: 'chénliè' },
        { zh: '在', py: 'zài' },
        { zh: '博物馆', py: 'bówùguǎn' },
        { zh: '里', py: 'lǐ' },
        { zh: '，', py: '' },
        { zh: '往往', py: 'wǎngwǎng' },
        { zh: '难以', py: 'nányǐ' },
        { zh: '真正', py: 'zhēnzhèng' },
        { zh: '延续', py: 'yánxù' },
        { zh: '其', py: 'qí' },
        { zh: '生命力', py: 'shēngmìnglì' },
        { zh: '。', py: '' }
      ],
      [
        { zh: '只有', py: 'zhǐyǒu' },
        { zh: '让', py: 'ràng' },
        { zh: '传统', py: 'chuántǒng' },
        { zh: '工艺', py: 'gōngyì' },
        { zh: '融入', py: 'róngrù' },
        { zh: '现代', py: 'xiàndài' },
        { zh: '生活', py: 'shēnghuó' },
        { zh: '，', py: '' },
        { zh: '结合', py: 'jiéhé' },
        { zh: '当代', py: 'dāngdài' },
        { zh: '设计', py: 'shèjì' },
        { zh: '与', py: 'yǔ' },
        { zh: '市场', py: 'shìchǎng' },
        { zh: '需求', py: 'xūqiú' },
        { zh: '进行', py: 'jìnxíng' },
        { zh: '创新', py: 'chuàngxīn' },
        { zh: '，', py: '' },
        { zh: '非遗', py: 'fēiyí' },
        { zh: '才能', py: 'cáinéng' },
        { zh: '在', py: 'zài' },
        { zh: '年轻人', py: 'niánqīngrén' },
        { zh: '群体', py: 'qúntǐ' },
        { zh: '中', py: 'zhōng' },
        { zh: '焕发', py: 'huànfā' },
        { zh: '新的', py: 'xīn de' },
        { zh: '活力', py: 'huólì' },
        { zh: '。', py: '' }
      ]
    ],
    questions: [
      {
        stem: '作者撰写这段文字的主要目的是什么？',
        options: ['强调非物质文化遗产需要融入现代生活并创新传承', '呼吁关闭所有展示传统技艺的博物馆', '说明传统工艺无法适应当代市场规律', '批评年轻人对传统文化缺乏任何兴趣'],
        correctIndexes: [0],
        explanation: 'Ý chính: Di sản văn hóa phi vật thể chỉ thực sự có sức sống khi hòa nhập vào đời sống hiện đại và đổi mới phù hợp nhu cầu thị trường.'
      },
      {
        stem: '作者认为单纯把传统技艺陈列在博物馆里有什么局限？',
        options: ['往往难以真正延续其生命力', '会导致博物馆门票价格过高', '会让传统工艺变得过于商业化', '会破坏文物的原始结构'],
        correctIndexes: [0],
        explanation: 'Chi tiết đoạn 1: 往往难以真正延续其生命力。'
      },
      {
        stem: '文中“焕发”一词最恰当的解释是：',
        options: ['重新展现出光彩与生机', '逐渐消失在历史长河中', '保持一成不变的古老样式', '引起社会各界的激烈争议'],
        correctIndexes: [0],
        explanation: 'Nghĩa ngữ cảnh: “焕发新的活力” là bừng lên, tỏa sáng sức sống mới.'
      },
      {
        stem: '怎样才能让非遗在年轻人群体中获得认可？（请选择2个正确答案）',
        options: ['让传统工艺融入现代生活', '结合当代设计与市场需求进行创新', '禁止现代设计师参与传统工艺改良', '把所有手工艺品封存起来不对外展示'],
        correctIndexes: [0, 1],
        explanation: 'Suy luận & chi tiết đoạn 2: 融入现代生活 và 结合当代设计与市场需求进行创新。'
      }
    ]
  },
  {
    id: 'p_hsk7_01',
    level: 7,
    needsReview: true,
    title: '人工智能时代的跨学科人才培养',
    paragraphs: [
      [
        { zh: '随着', py: 'suízhe' },
        { zh: '生成式', py: 'shēngchéngshì' },
        { zh: '人工智能', py: 'réngōng zhìnéng' },
        { zh: '在', py: 'zài' },
        { zh: '科研', py: 'kēyán' },
        { zh: '、', py: '' },
        { zh: '医疗', py: 'yīliáo' },
        { zh: '与', py: 'yǔ' },
        { zh: '制造', py: 'zhìzào' },
        { zh: '领域', py: 'lǐngyù' },
        { zh: '的', py: 'de' },
        { zh: '深度', py: 'shēndù' },
        { zh: '渗透', py: 'shèntòu' },
        { zh: '，', py: '' },
        { zh: '单一', py: 'dānyī' },
        { zh: '学科', py: 'xuékē' },
        { zh: '背景', py: 'bèijǐng' },
        { zh: '已', py: 'yǐ' },
        { zh: '难以', py: 'nányǐ' },
        { zh: '应对', py: 'yìngduì' },
        { zh: '复杂的', py: 'fùzá de' },
        { zh: '现实', py: 'xiànshí' },
        { zh: '挑战', py: 'tiǎozhàn' },
        { zh: '。', py: '' }
      ],
      [
        { zh: '高等教育', py: 'gāoděng jiàoyù' },
        { zh: '亟需', py: 'jíxū' },
        { zh: '打破', py: 'dǎpò' },
        { zh: '院系', py: 'yuànxì' },
        { zh: '壁垒', py: 'bìlěi' },
        { zh: '，', py: '' },
        { zh: '在', py: 'zài' },
        { zh: '夯实', py: 'hāngshí' },
        { zh: '数理', py: 'shùlǐ' },
        { zh: '与', py: 'yǔ' },
        { zh: '算法', py: 'suànfǎ' },
        { zh: '基础', py: 'jīchǔ' },
        { zh: '的', py: 'de' },
        { zh: '同时', py: 'tóngshí' },
        { zh: '，', py: '' },
        { zh: '培养', py: 'péiyǎng' },
        { zh: '学生的', py: 'xuéshēng de' },
        { zh: '批判性', py: 'pīpànxìng' },
        { zh: '思维', py: 'sīwéi' },
        { zh: '、', py: '' },
        { zh: '伦理', py: 'lúnlǐ' },
        { zh: '意识', py: 'yìshí' },
        { zh: '与', py: 'yǔ' },
        { zh: '人文', py: 'rénwén' },
        { zh: '素养', py: 'sùyǎng' },
        { zh: '。', py: '' }
      ]
    ],
    questions: [
      {
        stem: '作者撰写这段文字的核心观点是什么？',
        options: ['人工智能时代高校亟需推进跨学科复合型人才培养', '人文素养与伦理意识在科技时代已不再重要', '单一学科背景足以解决科研与医疗的所有难题', '高等教育应该取消数理与算法基础课程'],
        correctIndexes: [0],
        explanation: 'Ý chính: Giáo dục đại học thời đại AI cần phá bỏ rào cản giữa các khoa ngành để đào tạo nhân tài liên ngành toàn diện.'
      },
      {
        stem: '文中“打破院系壁垒”指的是什么？',
        options: ['消除不同学科与院系之间的隔阂，促进交叉融合', '拆除大学校园里的所有围墙与大门', '限制学生跨学院选修其他专业课程', '合并所有高校为一个单一学院'],
        correctIndexes: [0],
        explanation: 'Nghĩa ngữ cảnh: “院系壁垒” là rào cản giữa các khoa/ngành; “打破院系壁垒” là xóa bỏ rào cản để đào tạo liên ngành.'
      },
      {
        stem: '根据文章，人工智能时代的高等教育应注重培养哪些能力？（请选择2个正确答案）',
        options: ['批判性思维与伦理意识', '数理算法基础与人文素养', '只背诵固定模板答案的能力', '完全依赖机器替代人类判断'],
        correctIndexes: [0, 1],
        explanation: 'Chi tiết đoạn 2: Củng cố nền tảng toán lý & thuật toán, đồng thời bồi dưỡng tư duy phản biện, ý thức đạo đức và tố chất nhân văn.'
      },
      {
        stem: '从文中可以推断出什么？',
        options: ['技术深度应用对人才的综合素质提出了更高要求', '生成式人工智能目前仅应用于娱乐行业', '传统单一专业教育模式无需任何改革', '算法能力可以完全替代人文关怀'],
        correctIndexes: [0],
        explanation: 'Suy luận từ đoạn 1 & đoạn 2 về tác động sâu rộng của AI tới giáo dục đại học.'
      }
    ]
  }
];

export function getPassagesForLevel(level) {
  const lv = Number(level) || 1;
  const exact = READING_PASSAGES.filter((p) => p.level === lv);
  if (exact.length > 0) return exact;
  return READING_PASSAGES.filter((p) => p.level >= 6);
}