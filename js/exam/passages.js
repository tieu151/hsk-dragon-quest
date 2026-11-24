// Kho 36 đoạn văn đọc hiểu chuẩn HSK 1–9 (4 đoạn/cấp × 9 cấp = 144 câu hỏi đọc hiểu)
// Mỗi đoạn văn được gắn với bộ đề chuẩn (setIndex 1..4) để các đề thi không bao giờ trùng bài đọc.

function p(tokenizedStr) {
  return String(tokenizedStr || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => {
      const idx = chunk.indexOf('|');
      if (idx < 0) return { zh: chunk, py: '' };
      return { zh: chunk.slice(0, idx), py: chunk.slice(idx + 1).replace(/_/g, ' ') };
    });
}

export const READING_PASSAGES = [
  // ==================== HSK 1 (4 ĐOẠN) ====================
  {
    id: 'p_hsk1_01',
    level: 1,
    setIndex: 1,
    title: '周末去商店买水果',
    paragraphs: [
      p('今天|jīntiān 是|shì 星期六|xīngqīliù ， 天气|tiānqì 很|hěn 好|hǎo 。 上午|shàngwǔ 九点|jiǔ_diǎn ， 王明|Wáng_Míng 和|hé 妈妈|māma 一起|yìqǐ 去|qù 商店|shāngdiàn 买|mǎi 水果|shuǐguǒ 。'),
      p('商店|shāngdiàn 里|lǐ 的|de 苹果|píngguǒ 很|hěn 大|dà ， 也|yě 很|hěn 便宜|piányi 。 他们|tāmen 买|mǎi 了|le 五个|wǔ_gè 苹果|píngguǒ 和|hé 三杯|sān_bēi 牛奶|niúnǎi 。 中午|zhōngwǔ 十一点半|shíyī_diǎn_bàn ， 他们|tāmen 高高兴兴|gāogāoxìngxìng 地|de 回家|huí_jiā 做饭|zuò_fàn 。')
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
        explanation: 'Chi tiết đoạn 2: 他们买了五个苹果和三杯牛奶。'
      },
      {
        stem: '文中“高高兴兴”的意思是什么？',
        options: ['非常开心、愉快', '很生气、不满意', '非常累、想睡觉', '很着急、害怕'],
        correctIndexes: [0],
        explanation: '“高高兴兴地回家” là vui vẻ trở về nhà.'
      },
      {
        stem: '从文中可以知道什么？',
        options: ['他们中午十一点半左右回到家', '今天下雨，天气很冷', '商店里的苹果非常贵', '王明下午才去商店'],
        correctIndexes: [0],
        explanation: 'Câu cuối: 中午十一点半，他们高高兴兴地回家做饭。'
      }
    ]
  },
  {
    id: 'p_hsk1_02',
    level: 1,
    setIndex: 2,
    title: '我的汉语老师',
    paragraphs: [
      p('我|wǒ 叫|jiào 大卫|Dàwèi ， 是|shì 北京|Běijīng 大学|dàxué 的|de 学生|xuéshēng 。 我|wǒ 的|de 汉语|Hànyǔ 老师|lǎoshī 姓|xìng 陈|Chén ， 她|tā 今年|jīnnián 三十二|sānshí’èr 岁|suì ， 是|shì 北京人|Běijīngrén 。'),
      p('陈老师|Chén_lǎoshī 很|hěn 喜欢|xǐhuan 喝茶|hē_chá ， 也|yě 喜欢|xǐhuan 看书|kàn_shū 。 她|tā 每天|měitiān 上午|shàngwǔ 八点|bā_diǎn 来|lái 学校|xuéxiào 。 我们|wǒmen 都|dōu 很|hěn 喜欢|xǐhuan 听|tīng 她|tā 的|de 汉语课|Hànyǔ_kè 。')
    ],
    questions: [
      {
        stem: '大卫的汉语老师姓什么？',
        options: ['姓陈', '姓李', '姓王', '姓张'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 我的汉语老师姓陈。'
      },
      {
        stem: '陈老师今年多大了？',
        options: ['三十二岁', '二十三岁', '三十五岁', '四十岁'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 她今年三十二岁。'
      },
      {
        stem: '陈老师喜欢做什么？',
        options: ['喝茶和看书', '看电影和买衣服', '开出租车', '在医院工作'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 陈老师很喜欢喝茶，也喜欢看书。'
      },
      {
        stem: '陈老师每天几点来学校？',
        options: ['上午八点', '上午九点', '中午十二点', '下午三点'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 她每天上午八点来学校。'
      }
    ]
  },
  {
    id: 'p_hsk1_03',
    level: 1,
    setIndex: 3,
    title: '在饭馆吃中国菜',
    paragraphs: [
      p('今天|jīntiān 下午|xiàwǔ ， 我|wǒ 和|hé 朋友|péngyou 去|qù 学校|xuéxiào 前面|qiánmiàn 的|de 饭馆|fànguǎn 吃饭|chī_fàn 。 那个|nàge 饭馆|fànguǎn 不|bú 大|dà ， 但是|dànshì 中国菜|Zhōngguócài 很|hěn 好吃|hǎochī 。'),
      p('我|wǒ 吃|chī 了|le 一碗|yì_wǎn 米饭|mǐfàn 和|hé 鱼|yú ， 我|wǒ 的|de 朋友|péngyou 吃|chī 了|le 八个|bā_gè 饺子|jiǎozi 。 我们|wǒmen 还|hái 喝|hē 了|le 两杯|liǎng_bēi 热茶|rè_chá ， 一共|yígòng 花|huā 了|le 四十五|sìshíwǔ 块|kuài 钱|qián 。')
    ],
    questions: [
      {
        stem: '那个饭馆在哪里？',
        options: ['在学校前面', '在医院后面', '在火车站里面', '在商店楼上'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 去学校前面的饭馆吃饭。'
      },
      {
        stem: '“我”的朋友吃了什么？',
        options: ['八个饺子', '一碗面条', '三个苹果', '五个鸡蛋'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 我的朋友吃了八个饺子。'
      },
      {
        stem: '他们一共花了多少钱？',
        options: ['四十五块钱', '五十四块钱', '三十五块钱', '二十块钱'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 一共花了四十五块钱。'
      },
      {
        stem: '根据短文，那个饭馆怎么样？',
        options: ['不大，但是菜很好吃', '非常大，但是没有热茶', '菜很贵，也不好吃', '只卖水果和牛奶'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 那个饭馆不大，但是中国菜很好吃。'
      }
    ]
  },
  {
    id: 'p_hsk1_04',
    level: 1,
    setIndex: 4,
    title: '小李的一家',
    paragraphs: [
      p('小李|Xiǎo_Lǐ 家|jiā 有|yǒu 四口|sì_kǒu 人|rén ： 爸爸|bàba 、 妈妈|māma 、 姐姐|jiějie 和|hé 他|tā 。 他|tā 爸爸|bàba 是|shì 医生|yīshēng ， 在|zài 医院|yīyuàn 工作|gōngzuò ； 妈妈|māma 是|shì 小学|xiǎoxué 老师|lǎoshī 。'),
      p('小李|Xiǎo_Lǐ 的|de 姐姐|jiějie 今年|jīnnián 二十四|èrshísì 岁|suì ， 会|huì 说|shuō 汉语|Hànyǔ 和|hé 英语|Yīngyǔ 。 家|jiā 里|lǐ 还|hái 有|yǒu 一只|yì_zhī 白色|báisè 的|de 小猫|xiǎomāo ， 名字|míngzi 叫|jiào “雪花|Xuěhuā” 。')
    ],
    questions: [
      {
        stem: '小李的爸爸在哪儿工作？',
        options: ['在医院工作', '在学校工作', '在饭馆工作', '在商店工作'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 他爸爸是医生，在医院工作。'
      },
      {
        stem: '小李的姐姐会做什么？',
        options: ['会说汉语和英语', '会开飞机', '会做法国菜', '会修电脑'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 会说汉语和英语。'
      },
      {
        stem: '“雪花”是谁的名字？',
        options: ['家里那只白色小猫的名字', '小李姐姐的名字', '小李妈妈的名字', '医院医生的名字'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 家里还有一只白色的小猫，名字叫“雪花”。'
      },
      {
        stem: '小李家一共有几口人？',
        options: ['四口人', '三口人', '五口人', '六口人'],
        correctIndexes: [0],
        explanation: 'Câu đầu: 小李家有四口人。'
      }
    ]
  },

  // ==================== HSK 2 (4 ĐOẠN) ====================
  {
    id: 'p_hsk2_01',
    level: 2,
    setIndex: 1,
    title: '每天早上跑步锻炼',
    paragraphs: [
      p('李老师|Lǐ_lǎoshī 非常|fēicháng 喜欢|xǐhuan 运动|yùndòng 。 每天|měitiān 早上|zǎoshang 六点半|liù_diǎn_bàn ， 他|tā 都|dōu 去|qù 学校|xuéxiào 旁边|pángbiān 的|de 公园|gōngyuán 跑步|pǎobù 。'),
      p('公园|gōngyuán 里|lǐ 有|yǒu 很多|hěnduō 树|shù ， 空气|kōngqì 特别|tèbié 新鲜|xīnxiān 。 跑完步|pǎo_wán_bù 以后|yǐhòu ， 他|tā 去|qù 食堂|shítáng 吃|chī 早饭|zǎofàn ， 然后|ránhòu 开始|kāishǐ 准备|zhǔnbèi 八点|bā_diǎn 的|de 汉语课|Hànyǔ_kè 。')
    ],
    questions: [
      {
        stem: '这段短文主要介绍了李老师的什么习惯？',
        options: ['每天早上跑步锻炼并准时备课', '晚上在图书馆看电影', '周末去外地旅游', '每天下午在教室睡觉'],
        correctIndexes: [0],
        explanation: 'Ý chính: Thói quen chạy bộ buổi sáng ở công viên và chuẩn bị dạy tiếng Hán của thầy Lý.'
      },
      {
        stem: '李老师每天早上在哪里跑步？',
        options: ['学校旁边的公园', '教室里面', '火车站前面', '医院后面'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 他都去学校旁边的公园跑步。'
      },
      {
        stem: '文中“新鲜”用来形容什么？',
        options: ['公园里的空气', '食堂里的报纸', '教室里的桌子', '商店里的手机'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 公园里有很多树，空气特别新鲜。'
      },
      {
        stem: '从文中可以推断出李老师的职业是什么？',
        options: ['教汉语的老师', '医院的医生', '商店的售货员', '出租车司机'],
        correctIndexes: [0],
        explanation: 'Suy luận từ 李老师 và 准备八点的汉语课。'
      }
    ]
  },
  {
    id: 'p_hsk2_02',
    level: 2,
    setIndex: 2,
    title: '给妈妈准备生日礼物',
    paragraphs: [
      p('下个|xià_gè 星期天|xīngqītiān 是|shì 妈妈|māma 的|de 生日|shēngrì 。 妹妹|mèimei 和|hé 我|wǒ 想|xiǎng 送|sòng 给|gěi 她|tā 一件|yí_jiàn 特别|tèbié 的|de 礼物|lǐwù 。 妈妈|māma 平时|píngshí 工作|gōngzuò 很|hěn 忙|máng ， 走路|zǒulù 的|de 时间|shíjiān 很多|hěnduō 。'),
      p('昨天|zuótiān 下午|xiàwǔ ， 我们|wǒmen 去|qù 商场|shāngchǎng 买|mǎi 了|le 一双|yì_shuāng 黑色|hēisè 的|de 运动鞋|yùndòngxié ， 穿|chuān 起来|qǐlái 非常|fēicháng 舒服|shūfu 。 我|wǒ 还|hái 写|xiě 了|le 一张|yì_zhāng 生日卡|shēngrìkǎ ， 希望|xīwàng 妈妈|māma 每天|měitiān 都|dōu 快乐|kuàilè 、 健康|jiànkāng 。')
    ],
    questions: [
      {
        stem: '谁的生日快到了？',
        options: ['妈妈的生日', '妹妹的生日', '爸爸的生日', '老师的生日'],
        correctIndexes: [0],
        explanation: 'Câu đầu: 下个星期天是妈妈的生日。'
      },
      {
        stem: '他们为什么给妈妈买运动鞋？',
        options: ['因为妈妈工作忙、走路多，运动鞋穿着舒服', '因为妈妈要去参加篮球比赛', '因为商场里只卖运动鞋', '因为妹妹想自己穿这双鞋'],
        correctIndexes: [0],
        explanation: 'Đoạn 1 & 2: 妈妈平时工作很忙，走路的时间很多……买了一双黑色的运动鞋，穿起来非常舒服。'
      },
      {
        stem: '除了运动鞋，“我”还准备了什么？',
        options: ['写了一张生日卡', '做了一个大蛋糕', '买了一块新手表', '唱了一首英文歌'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 我还写了一张生日卡。'
      },
      {
        stem: '他们买的那双运动鞋是什么颜色的？',
        options: ['黑色的', '白色的', '红色的', '黄色的'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 买了一双黑色的运动鞋。'
      }
    ]
  },
  {
    id: 'p_hsk2_03',
    level: 2,
    setIndex: 3,
    title: '第一次坐高铁去上海',
    paragraphs: [
      p('上个月|shàng_gè_yuè ， 我|wǒ 和|hé 同学|tóngxué 坐|zuò 高铁|gāotiě 去|qù 上海|Shànghǎi 旅游|lǚyóu 。 从|cóng 北京|Běijīng 到|dào 上海|Shànghǎi 虽然|suīrán 很|hěn 远|yuǎn ， 但是|dànshì 高铁|gāotiě 开|kāi 得|de 非常|fēicháng 快|kuài ， 四五个|sì-wǔ_gè 小时|xiǎoshí 就|jiù 到了|dào_le 。'),
      p('火车|huǒchē 上|shàng 又|yòu 干净|gānjìng 又|yòu 安静|ānjìng 。 我|wǒ 坐在|zuò_zài 窗户|chuānghu 旁边|pángbiān ， 一边|yìbiān 喝|hē 咖啡|kāfēi ， 一边|yìbiān 看|kàn 外面|wàimiàn 的|de 风景|fēngjǐng ， 觉得|juéde 时间|shíjiān 过|guò 得|de 真|zhēn 快|kuài 。')
    ],
    questions: [
      {
        stem: '作者和同学是怎么去上海的？',
        options: ['坐高铁去的', '坐飞机去的', '自己开车去的', '坐公共汽车去的'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 我和同学坐高铁去上海旅游。'
      },
      {
        stem: '从北京坐高铁到上海大概需要多长时间？',
        options: ['四五个小时', '十几个小时', '二十分钟', '三天三夜'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 四五个小时就到了。'
      },
      {
        stem: '作者在火车上做了什么？',
        options: ['一边喝咖啡，一边看窗外的风景', '一直在车上大声唱歌', '在火车上做晚饭', '帮乘务员打扫房间'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 一边喝咖啡，一边看外面的风景。'
      },
      {
        stem: '作者觉得高铁上的环境怎么样？',
        options: ['又干净又安静', '人太多、非常吵', '座位很小、不舒服', '非常冷、没有热水'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 火车上又干净又安静。'
      }
    ]
  },
  {
    id: 'p_hsk2_04',
    level: 2,
    setIndex: 4,
    title: '生病了要多休息',
    paragraphs: [
      p('这两天|zhè_liǎng_tiān 天气|tiānqì 突然|tūrán 变|biàn 冷|lěng 了|le ， 小王|Xiǎo_Wáng 穿|chuān 的|de 衣服|yīfu 太|tài 少|shǎo ， 所以|suǒyǐ 感冒|gǎnmào 了|le 。 今天|jīntiān 早上|zǎoshang 他|tā 觉得|juéde 头|tóu 很|hěn 疼|téng ， 没有|méiyǒu 去|qù 公司|gōngsī 上班|shàngbān 。'),
      p('妻子|qīzi 陪|péi 他|tā 去|qù 医院|yīyuàn 看病|kànbìng 。 医生|yīshēng 让|ràng 他|tā 按时|ànshí 吃药|chī_yào ， 多|duō 喝|hē 温水|wēnshuǐ ， 在家|zài_jiā 好好|hǎohǎo 休息|xiūxi 两天|liǎng_tiān ， 不要|búyào 太|tài 累|lèi 。')
    ],
    questions: [
      {
        stem: '小王为什么感冒了？',
        options: ['天气突然变冷，他穿的衣服太少', '他每天吃太多冰淇淋', '他在游泳池游了五个小时', '他昨晚一直没关空调'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 这两天天气突然变冷了，小王穿的衣服太少，所以感冒了。'
      },
      {
        stem: '小王今天早上为什么没去上班？',
        options: ['因为头很疼，去医院看病了', '因为今天是周末不用上班', '因为他去机场接朋友了', '因为他的自行车坏了'],
        correctIndexes: [0],
        explanation: 'Đoạn 1 & 2: 今天早上他觉得头很疼，没有去公司上班。妻子陪他去医院看病。'
      },
      {
        stem: '是谁陪小王去医院的？',
        options: ['他的妻子', '他的公司经理', '他的小学老师', '他的邻居'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 妻子陪他去医院看病。'
      },
      {
        stem: '医生给了小王什么建议？',
        options: ['按时吃药、多喝温水并在家休息', '立刻去公园跑步两个小时', '马上回公司继续加班', '不用吃药也不用喝水'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 医生让他按时吃药，多喝温水，在家好好休息两天。'
      }
    ]
  },

  // ==================== HSK 3 (4 ĐOẠN) ====================
  {
    id: 'p_hsk3_01',
    level: 3,
    setIndex: 1,
    title: '骑自行车上班的好处',
    paragraphs: [
      p('以前|yǐqián 小张|Xiǎo_Zhāng 每天|měitiān 开车|kāichē 去|qù 公司|gōngsī ， 但是|dànshì 早上|zǎoshang 路上|lùshang 经常|jīngcháng 堵车|dǔchē ， 他|tā 差不多|chàbuduō 要|yào 花|huā 一个小时|yí_gè_xiǎoshí 才能|cáinéng 到|dào 。'),
      p('上个月|shàng_gè_yuè ， 他|tā 决定|juédìng 改骑|gǎi_qí 自行车|zìxíngchē 上班|shàngbān 。 现在|xiànzài 他|tā 只要|zhǐyào 二十五分钟|èrshíwǔ_fēnzhōng 就|jiù 能|néng 到|dào 公司|gōngsī ， 既|jì 节约|jiéyuē 了|le 时间|shíjiān ， 又|yòu 锻炼|duànliàn 了|le 身体|shēntǐ 。')
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
        explanation: 'Đoạn 1: 早上路上经常堵车，他差不多要花一个小时才能到。'
      },
      {
        stem: '文中“节约”的意思最接近下列哪一项？',
        options: ['节省、不浪费', '增加、延长', '忘记、丢失', '借给别人'],
        correctIndexes: [0],
        explanation: '“节约了时间” nghĩa là tiết kiệm thời gian.'
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
    id: 'p_hsk3_02',
    level: 3,
    setIndex: 2,
    title: '社区图书馆的周末读书会',
    paragraphs: [
      p('为了|wèile 让|ràng 更多|gèng_duō 居民|jūmín 养成|yǎngchéng 阅读|yuèdú 的|de 好习惯|hǎo_xíguàn ， 我们|wǒmen 社区|shèqū 的|de 图书馆|túshūguǎn 从|cóng 今年|jīnnián 春天|chūntiān 开始|kāishǐ ， 每个|měi_gè 星期六|xīngqīliù 下午|xiàwǔ 都|dōu 举办|jǔbàn 免费|miǎnfèi 的|de 读书会|dúshūhuì 。'),
      p('参加|cānjiā 的|de 人|rén 可以|kěyǐ 带上|dàishàng 自己|zìjǐ 最|zuì 喜欢|xǐhuan 的|de 一本书|yì_běn_shū ， 和|hé 大家|dàjiā 互相|hùxiāng 介绍|jièshào 内容|nèiróng 、 交流|jiāoliú 想法|xiǎngfǎ 。 现在|xiànzài 不但|búdàn 年轻人|niánqīngrén 爱|ài 来|lái ， 很多|hěnduō 退休|tuìxiū 的|de 老人|lǎorén 也|yě 成了|chéng_le 这里|zhèlǐ 的|de 常客|chángkè 。')
    ],
    questions: [
      {
        stem: '社区图书馆为什么要举办周末读书会？',
        options: ['为了让更多居民养成阅读的好习惯', '为了把旧书高价卖给居民', '为了出租图书馆的会议室', '为了教大家如何修理电脑'],
        correctIndexes: [0],
        explanation: 'Câu mở đầu: 为了让更多居民养成阅读的好习惯。'
      },
      {
        stem: '读书会在什么时间举办？',
        options: ['每个星期六下午', '每个星期一早上', '每天晚上十点', '每年冬天的一个月'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 每个星期六下午都举办免费的读书会。'
      },
      {
        stem: '文中“常客”是什么意思？',
        options: ['经常来某个地方的人', '第一次来参观的客人', '图书馆的工作人员', '住在很远城市的游客'],
        correctIndexes: [0],
        explanation: '“常客” là khách quen, người thường xuyên lui tới.'
      },
      {
        stem: '参加读书会的人可以在活动中做什么？（请选择2个正确答案）',
        options: ['带上自己喜欢的书介绍内容', '和大家互相交流想法', '免费领取一台新笔记本电脑', '在图书馆里大声播放音乐'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 带上自己最喜欢的一本书，和大家互相介绍内容、交流想法。'
      }
    ]
  },
  {
    id: 'p_hsk3_03',
    level: 3,
    setIndex: 3,
    title: '学会做家务的小林',
    paragraphs: [
      p('小林|Xiǎo_Lín 上|shàng 大学|dàxué 以前|yǐqián 一直|yìzhí 住在|zhù_zài 家里|jiālǐ ， 衣服|yīfu 是|shì 妈妈|māma 洗|xǐ ， 饭|fàn 也|yě 是|shì 爸爸|bàba 妈妈|māma 做|zuò 。 去年|qùnián 秋天|qiūtiān 他|tā 一个人|yí_gè_rén 到|dào 外地|wàidì 读书|dúshū ， 刚开始|gāng_kāishǐ 生活|shēnghuó 遇到|yùdào 了|le 不少|bùshǎo 困难|kùnnan 。'),
      p('后来|hòulái ， 他|tā 经常|jīngcháng 给|gěi 妈妈|māma 打|dǎ 视频电话|shìpín_diànhuà 请教|qǐngjiào ， 还|hái 在|zài 网上|wǎngshàng 看|kàn 做菜|zuò_cài 的|de 短视频|duǎnshìpín 。 经过|jīngguò 半年|bàn_nián 的|de 练习|liànxí ， 他|tā 不但|búdàn 把|bǎ 房间|fángjiān 整理|zhěnglǐ 得|de 干干净净|gāngānjìngjìng ， 还|hái 学会|xuéhuì 了|le 做|zuò 好几道|hǎojǐ_dào 拿手菜|náshǒucài 。')
    ],
    questions: [
      {
        stem: '小林刚到外地读大学时为什么遇到不少困难？',
        options: ['因为以前在家从不做家务，缺乏独立生活经验', '因为他听不懂老师讲的汉语', '因为学校附近没有超市和食堂', '因为他的手机和电脑都丢了'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: Trước khi học đại học, quần áo và cơm nước đều do bố mẹ làm nên khi ra ngoài học một mình gặp nhiều bỡ ngỡ.'
      },
      {
        stem: '小林是通过哪些方式学习做饭的？（请选择2个正确答案）',
        options: ['给妈妈打视频电话请教', '在网上看做菜的短视频', '报名去酒店当厨师', '请同屋每天帮他做饭'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 经常给妈妈打视频电话请教，还在网上看做菜的短视频。'
      },
      {
        stem: '文中“拿手菜”指的是什么样的菜？',
        options: ['自己最擅长、做得最好吃的菜', '必须要用手拿着吃的菜', '在饭馆里价格最贵的菜', '从来没有尝试做过的菜'],
        correctIndexes: [0],
        explanation: '“拿手菜” là món tủ, món ăn mình nấu khéo và ngon nhất.'
      },
      {
        stem: '半年以后，小林发生了什么变化？',
        options: ['能把房间整理得很干净，还会做好几道菜', '决定退学回家和父母住', '每天都在外面饭馆点外卖', '再也不和家里人打电话了'],
        correctIndexes: [0],
        explanation: 'Câu cuối: 他不但把房间整理得干干净净，还学会了做好几道拿手菜。'
      }
    ]
  },
  {
    id: 'p_hsk3_04',
    level: 3,
    setIndex: 4,
    title: '准时是一种重要的礼貌',
    paragraphs: [
      p('无论是|wúlùn_shì 和|hé 朋友|péngyou 见面|jiànmiàn ， 还是|háishi 参加|cānjiā 公司|gōngsī 的|de 会议|huìyì ， 准时|zhǔnshí 都|dōu 是|shì 一种|yì_zhǒng 非常|fēicháng 重要|zhòngyào 的|de 礼貌|lǐmào 。 如果|rúguǒ 经常|jīngcháng 迟到|chídào ， 别人|biérén 就|jiù 会|huì 觉得|juéde 你|nǐ 不够|búgòu 重视|zhòngshì 这次|zhè_cì 约会|yuēhuì 。'),
      p('因此|yīncǐ ， 出门|chūmén 以前|yǐqián 最好|zuìhǎo 先|xiān 查一查|chá_yi_chá 天气|tiānqì 和|hé 交通|jiāotōng 情况|qíngkuàng ， 提前|tíqián 十分钟|shí_fēnzhōng 到达|dàodá 目的|mùdì 地|dì 。 万一|wànyī 路上|lùshang 遇到|yùdào 特殊|tèshū 情况|qíngkuàng 要|yào 晚到|wǎn_dào ， 也|yě 应该|yīnggāi 及时|jíshí 发消息|fā_xiāoxi 或者|huòzhě 打电话|dǎ_diànhuà 告诉|gàosu 对方|duìfāng 。')
    ],
    questions: [
      {
        stem: '这段话主要强调了什么观点？',
        options: ['守时准时是人际交往与工作中的重要礼貌', '开会时迟到几分钟完全没有关系', '和朋友见面不需要提前约定时间', '出门前不需要关心天气变化'],
        correctIndexes: [0],
        explanation: 'Ý chính: Đúng giờ là phép lịch sự quan trọng trong cả giao tiếp bạn bè lẫn công việc.'
      },
      {
        stem: '如果一个人经常迟到，会给别人留下什么印象？',
        options: ['觉得他不够重视这次约会', '觉得他是一个非常热情的人', '觉得他的工作能力特别强', '觉得他住的地方风景很好'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 如果经常迟到，别人就会觉得你不够重视这次约会。'
      },
      {
        stem: '为了避免迟到，出门前应该做好哪些准备？（请选择2个正确答案）',
        options: ['先查一查天气和交通情况', '争取提前十分钟到达目的地', '把手机关机不接任何电话', '故意比约定时间晚半小时出发'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 出门以前最好先查一查天气和交通情况，提前十分钟到达目的地。'
      },
      {
        stem: '万一路上遇到特殊情况可能会晚到，应该怎么做？',
        options: ['及时发消息或打电话告诉对方', '直接回家不再去见面了', '到了以后责怪路上车太多', '假装忘记了今天的约定'],
        correctIndexes: [0],
        explanation: 'Câu cuối: 也应该及时发消息或者打电话告诉对方。'
      }
    ]
  },

  // ==================== HSK 4 (4 ĐOẠN) ====================
  {
    id: 'p_hsk4_01',
    level: 4,
    setIndex: 1,
    title: '阅读纸质书与电子书',
    paragraphs: [
      p('随着|suízhe 手机|shǒujī 和|hé 平板电脑|píngbǎn_diànnǎo 的|de 普及|pǔjí ， 越来越多|yuèláiyuè_duō 的|de 年轻人|niánqīngrén 习惯|xíguàn 在|zài 网上|wǎngshàng 阅读|yuèdú 电子书|diànzǐshū 。 电子书|diànzǐshū 不仅|bùjǐn 携带|xiédài 方便|fāngbiàn ， 而且|érqiě 价格|jiàgé 通常|tōngcháng 比|bǐ 纸质书|zhǐzhìshū 便宜|piányi 。'),
      p('不过|búguò ， 仍然|réngrán 有|yǒu 不少人|bùshǎo_rén 更|gèng 喜欢|xǐhuan 纸质书|zhǐzhìshū 。 他们|tāmen 认为|rènwéi 翻阅|fānyuè 纸张|zhǐzhāng 更有|gèng_yǒu 阅读|yuèdú 的|de 氛围|fēnwéi ， 也|yě 不容易|bù_róngyì 让|ràng 眼睛|yǎnjing 感到|gǎndào 疲劳|píláo 。')
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
        explanation: '“普及” là phổ cập, được sử dụng rộng rãi.'
      },
      {
        stem: '人们更喜欢纸质书的原因有哪些？（请选择2个正确答案）',
        options: ['更有阅读的氛围', '不容易让眼睛感到疲劳', '可以自动朗读所有外语文章', '不需要任何空间存放'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 更有阅读的氛围，也不容易让眼睛感到疲劳。'
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
    id: 'p_hsk4_02',
    level: 4,
    setIndex: 2,
    title: '拒绝“拖延症”的方法',
    paragraphs: [
      p('在|zài 学习|xuéxí 和|hé 工作|gōngzuò 中|zhōng ， 很多人|hěnduō_rén 都|dōu 有|yǒu “拖延|tuōyán” 的|de 毛病|máobìng ： 明明|míngmíng 知道|zhīdào 任务|rènwu 很|hěn 重要|zhòngyào ， 却|què 总是|zǒngshì 等到|děngdào 最后|zuìhòu 一刻|yí_kè 才|cái 着急|zháojí 去|qù 做|zuò ， 结果|jiéguǒ 往往|wǎngwǎng 既|jì 影响|yǐngxiǎng 质量|zhìliàng ， 又|yòu 增加|zēngjiā 了|le 心理|xīnlǐ 压力|yālì 。'),
      p('心理学家|xīnlǐxuéjiā 建议|jiànyì ， 当|dāng 面对|miànduì 一项|yí_xiàng 复杂|fùzá 的|de 工作|gōngzuò 时|shí ， 可以|kěyǐ 先|xiān 把|bǎ 它|tā 拆分成|chāifēn_chéng 几个|jǐ_gè 容易|róngyì 完成|wánchéng 的|de 小目标|xiǎo_mùbiāo ， 并|bìng 关掉|guāndiào 手机|shǒujī 上|shàng 无关|wúguān 的|de 提醒|tíxǐng 。 只要|zhǐyào 迈出|màichū 第一步|dì-yī_bù ， 后面的|hòumiàn_de 事情|shìqing 就|jiù 会|huì 顺利|shùnlì 得多|de_duō 。')
    ],
    questions: [
      {
        stem: '根据第一段，做事拖延会带来什么后果？',
        options: ['既影响完成质量，又增加心理压力', '能让工作效率提高一倍', '可以让复杂的工作自动完成', '会得到领导的表扬和奖金'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 结果往往既影响质量，又增加了心理压力。'
      },
      {
        stem: '心理学家建议如何应对复杂的工作？（请选择2个正确答案）',
        options: ['把复杂工作拆分成容易完成的小目标', '关掉手机上无关的消息提醒', '等到截止日期的最后一小时再开始', '同时打开十几个网页一边玩一边做'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 把它拆分成几个容易完成的小目标，并关掉手机上无关的提醒。'
      },
      {
        stem: '文中“迈出第一步”强调的是什么？',
        options: ['克服畏难情绪，立刻开始行动', '每天早上出门散步一公里', '先买一双新的运动鞋', '把工作推给同事去做'],
        correctIndexes: [0],
        explanation: 'Trong ngữ cảnh chống trì hoãn, “迈出第一步” là bắt tay vào hành động ngay từ bước nhỏ đầu tiên.'
      },
      {
        stem: '这段话最适合送给哪类人？',
        options: ['做事喜欢拖拉、总在最后关头赶工的人', '每天提前半小时完成计划的人', '从来不使用智能手机的老人', '正在准备马拉松比赛的运动员'],
        correctIndexes: [0],
        explanation: 'Đoạn văn hướng dẫn cách khắc phục chứng trì hoãn (拖延症).'
      }
    ]
  },
  {
    id: 'p_hsk4_03',
    level: 4,
    setIndex: 3,
    title: '入乡随俗与跨文化交流',
    paragraphs: [
      p('中国|Zhōngguó 有|yǒu 句|jù 老话|lǎohuà 叫|jiào “入乡随俗|rù_xiāng_suí_sú” ， 意思|yìsi 是|shì 到|dào 了|le 一个|yí_gè 新|xīn 的|de 地方|dìfang ， 就|jiù 应该|yīnggāi 尊重|zūnzhòng 并|bìng 适应|shìyìng 当地|dāngdì 的|de 风俗|fēngsú 习惯|xíguàn 。 在|zài 国际|guójì 交流|jiāoliú 日益|rìyì 频繁|pínfán 的|de 今天|jīntiān ， 这一点|zhè_yì_diǎn 显得|xiǎnde 尤为|yóuwéi 重要|zhòngyào 。'),
      p('比如|bǐrú ， 不同|bùtóng 国家|guójiā 在|zài 餐桌|cānzhuō 礼仪|lǐyí 、 时间|shíjiān 观念|guānniàn 以及|yǐjí 赠送|zèngsòng 礼物|lǐwù 的|de 方式|fāngshì 上|shàng 都|dōu 存在|cúnzài 差异|chāyì 。 出国|chūguó 旅行|lǚxíng 或|huò 工作|gōngzuò 前|qián 多|duō 做|zuò 一些|yìxiē 功课|gōngkè ， 不仅|bùjǐn 能|néng 避免|bìmiǎn 不必要|bú_bìyào 的|de 误会|wùhuì ， 还|hái 能|néng 帮助|bāngzhù 我们|wǒmen 更快|gèng_kuài 地|de 赢得|yíngdé 当地人|dāngdìrén 的|de 友谊|yǒuyì 。')
    ],
    questions: [
      {
        stem: '文中“入乡随俗”是什么意思？',
        options: ['到一个新地方应尊重并适应当地的风俗习惯', '去农村旅游时一定要住在农民家里', '要求外国人必须改变自己的国籍', '不管去哪里都只吃自己家乡的饭菜'],
        correctIndexes: [0],
        explanation: 'Đoạn 1 giải thích rõ: 到了一个新的地方，就应该尊重并适应当地的风俗习惯。'
      },
      {
        stem: '第二段提到了不同国家在哪些方面存在文化差异？（请选择2个正确答案）',
        options: ['餐桌礼仪与时间观念', '赠送礼物的方式', '呼吸空气的频率', '每天太阳升起的方向'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 不同国家在餐桌礼仪、时间观念以及赠送礼物的方式上都存在差异。'
      },
      {
        stem: '第二段中“多做一些功课”指的是什么？',
        options: ['提前了解目的地的文化习俗与礼仪规范', '在飞机上完成老师布置的数学作业', '出发前背熟整本汉语词典', '多带几套厚衣服和药品'],
        correctIndexes: [0],
        explanation: '“做功课” trong ngữ cảnh đi nước ngoài là tìm hiểu trước về văn hóa, phong tục nơi sắp đến.'
      },
      {
        stem: '尊重当地风俗习惯能带来什么积极作用？',
        options: ['避免不必要的误会并更快赢得当地人的友谊', '可以免除所有的机票和酒店费用', '不需要办理护照和签证', '立刻学会当地所有的方言'],
        correctIndexes: [0],
        explanation: 'Câu cuối: 不仅能避免不必要的误会，还能帮助我们更快地赢得当地人的友谊。'
      }
    ]
  },
  {
    id: 'p_hsk4_04',
    level: 4,
    setIndex: 4,
    title: '网购时代的理性消费',
    paragraphs: [
      p('如今|rújīn ， 网络|wǎngluò 购物|gòuwù 已经|yǐjīng 成为|chéngwéi 人们|rénmen 日常|rìcháng 生活|shēnghuó 的|de 一部分|yí_bùfen 。 每逢|měiféng 购物节|gòuwùjié ， 各种|gèzhǒng “满减|mǎnjiǎn” 、 “限时|xiànshí 折扣|zhékòu” 活动|huódòng 让人|ràng_rén 眼花缭乱|yǎnhuā-liáoluàn ， 不少|bùshǎo 消费者|xiāofèizhě 因为|yīnwèi 贪图|tāntú 便宜|piányi 而|ér 买回|mǎi_huí 许多|xǔduō 根本|gēnběn 用不上|yòng_bu_shàng 的|de 东西|dōngxi 。'),
      p('真正|zhēnzhèng 聪明|cōngming 的|de 消费者|xiāofèizhě 懂得|dǒngde “按需|àn_xū 购买|gòumǎi” 。 在|zài 下单|xiàdān 之前|zhīqián 先|xiān 列|liè 一张|yì_zhāng 购物|gòuwù 清单|qīngdān ， 冷静|lěngjìng 思考|sīkǎo 这件|zhè_jiàn 商品|shāngpǐn 是否|shìfǒu 真的|zhēnde 实用|shíyòng ， 这样|zhèyàng 既|jì 能|néng 省下|shěngxià 开支|kāizhī ， 也|yě 能|néng 减少|jiǎnshǎo 资源|zīyuán 浪费|làngfèi 。')
    ],
    questions: [
      {
        stem: '购物节期间，不少消费者为什么会买回很多用不上的东西？',
        options: ['被各种促销折扣吸引，贪图便宜而冲动消费', '因为商场强迫每个人必须买满十件商品', '因为网上所有的商品都是免费赠送的', '因为他们完全不知道商品的价格'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 不少消费者因为贪图便宜而买回许多根本用不上的东西。'
      },
      {
        stem: '文中“眼花缭乱”用来形容什么？',
        options: ['促销活动和商品种类繁多，让人看不过来', '看手机太久导致视力严重下降', '网店的网页设计颜色太暗看不清', '快递员送货的速度非常快'],
        correctIndexes: [0],
        explanation: '“眼花缭乱” nghĩa là hoa cả mắt trước vô số chương trình khuyến mãi.'
      },
      {
        stem: '作者建议在下单之前应该怎么做？（请选择2个正确答案）',
        options: ['先列一张购物清单', '冷静思考商品是否真的实用', '只要看到打折就立刻买下来', '借钱购买最昂贵的奢侈品'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 在下单之前先列一张购物清单，冷静思考这件商品是否真的实用。'
      },
      {
        stem: '这篇文章主要倡导什么样的消费观念？',
        options: ['理性消费、按需购买，减少盲目浪费', '完全停止使用网络购物平台', '只在实体商场购买打折商品', '买东西越贵越好、越便宜越差'],
        correctIndexes: [0],
        explanation: 'Ý chính toàn bài: Khuyến khích tiêu dùng lý trí, mua theo nhu cầu thực tế (按需购买).'
      }
    ]
  },

  // ==================== HSK 5 (4 ĐOẠN) ====================
  {
    id: 'p_hsk5_01',
    level: 5,
    setIndex: 1,
    title: '城市绿化与居民生活质量',
    paragraphs: [
      p('近年来|jìnniánlái ， 许多|xǔduō 大城市|dà_chéngshì 在|zài 发展|fāzhǎn 经济|jīngjì 的|de 同时|tóngshí ， 越来越|yuèláiyuè 重视|zhòngshì 生态|shēngtài 环境|huánjìng 建设|jiànshè 。 社区|shèqū 周边|zhōubiān 新建|xīnjiàn 了|le 不少|bùshǎo 口袋公园|kǒudài_gōngyuán 和|hé 步行|bùxíng 绿道|lǜdào 。'),
      p('这些|zhèxiē 绿色|lǜsè 空间|kōngjiān 不仅|bùjǐn 改善|gǎishàn 了|le 局部|júbù 气候|qìhòu 与|yǔ 空气|kōngqì 质量|zhìliàng ， 也|yě 为|wèi 忙碌|mánglù 的|de 都市人|dūshìrén 提供|tígōng 了|le 放松|fàngsōng 身心|shēnxīn 、 增进|zēngjìn 邻里|línlǐ 交流|jiāoliú 的|de 场所|chǎngsuǒ 。')
    ],
    questions: [
      {
        stem: '这篇文章的核心主旨是什么？',
        options: ['城市绿色空间建设改善了生态并提升了居民生活品质', '大城市应该停止经济建设以保护森林', '社区周边不再适合建造商业设施', '都市人普遍缺乏足够的睡眠时间'],
        correctIndexes: [0],
        explanation: 'Ý chính: Xây dựng công viên bỏ túi và đường xanh đô thị vừa cải thiện môi trường vừa nâng cao chất lượng sống cư dân.'
      },
      {
        stem: '文中“增进”的意思最接近于：',
        options: ['促进、加深', '削弱、减少', '推迟、取消', '模仿、复制'],
        correctIndexes: [0],
        explanation: '“增进邻里交流” là thúc đẩy, tăng cường giao lưu láng giềng.'
      },
      {
        stem: '新建的绿色空间带来了哪些积极影响？（请选择2个正确答案）',
        options: ['改善局部气候与空气质量', '提供放松身心与邻里交流的场所', '彻底消除了城市所有交通噪声', '大幅降低了居民的住房贷款利率'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2 nêu hai lợi ích rõ rệt của không gian xanh.'
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
    id: 'p_hsk5_02',
    level: 5,
    setIndex: 2,
    title: '老字号品牌的创新突围',
    paragraphs: [
      p('许多|xǔduō 拥有|yōngyǒu 上百年|shàng_bǎi_nián 历史|lìshǐ 的|de “老字号|lǎozìhào” 品牌|pǐnpái ， 凭借|píngjiè 独特|dútè 的|de 传统|chuántǒng 配方|pèifāng 和|hé 精湛|jīngzhàn 的|de 工艺|gōngyì ， 曾|céng 赢得|yíngdé 几代人|jǐ_dài_rén 的|de 信赖|xìnlài 。 然而|rán’ér ， 在|zài 消费|xiāofèi 潮流|cháoliú 快速|kuàisù 更迭|gēngdié 的|de 当下|dāngxià ， 单纯|dānchún 依靠|yīkào “怀旧|huáijiù” 已|yǐ 很难|hěn_nán 吸引|xīyǐn 年轻|niánqīng 一代|yí_dài 。'),
      p('近年来|jìnniánlái ， 不少|bùshǎo 老字号|lǎozìhào 主动|zhǔdòng 求变|qiú_biàn ： 一方面|yì_fāngmiàn 坚守|jiānshǒu 核心|héxīn 品质|pǐnzhì 标准|biāozhǔn ， 另一方面|lìng_yì_fāngmiàn 推出|tuīchū 低糖|dītáng 健康|jiànkāng 的|de 新口味|xīn_kǒuwèi ， 并|bìng 借助|jièzhù 国潮|guócháo 包装|bāozhuāng 与|yǔ 短视频|duǎnshìpín 直播|zhíbō 走近|zǒujìn 年轻|niánqīng 消费者|xiāofèizhě ， 重新|chóngxīn 打开|dǎkāi 了|le 广阔|guǎngkuò 的|de 市场|shìchǎng 。')
    ],
    questions: [
      {
        stem: '老字号品牌在当下遇到了什么挑战？',
        options: ['消费潮流快速变化，单纯靠情怀怀旧难以吸引年轻人', '传统配方全部丢失无法继续生产', '老年消费者不再购买任何传统商品', '国家禁止老字号品牌在市场上销售'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 在消费潮流快速更迭的当下，单纯依靠“怀旧”已很难吸引年轻一代。'
      },
      {
        stem: '文中“精湛”一词用来形容老字号的什么特点？',
        options: ['技艺高超、精益求精的制作工艺', '高昂的商品售价', '庞大的线下门店数量', '铺天盖地的电视广告'],
        correctIndexes: [0],
        explanation: '“精湛的工艺” là tay nghề/kỹ nghệ tinh xảo, điêu luyện.'
      },
      {
        stem: '老字号品牌采取了哪些创新举措来赢得年轻市场？（请选择2个正确答案）',
        options: ['研发低糖健康的新口味并采用国潮包装', '借助短视频与直播贴近年轻消费者', '放弃原有的核心品质标准以降低成本', '关闭所有线上销售渠道只做批发'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 推出低糖健康的新口味，并借助国潮包装与短视频直播走近年轻消费者。'
      },
      {
        stem: '这段文字想要传达的核心启示是什么？',
        options: ['传统品牌应在坚守品质底线的同时与时俱进、创新表达', '老字号应该完全抛弃传统工艺改做电子产品', '只有超过一百年的企业才需要做短视频推广', '年轻人只关心包装好不好看，完全不在乎质量'],
        correctIndexes: [0],
        explanation: 'Ý chính đoạn 2: 一方面坚守核心品质标准，另一方面主动求变创新。'
      }
    ]
  },
  {
    id: 'p_hsk5_03',
    level: 5,
    setIndex: 3,
    title: '碎片化阅读与深度思考',
    paragraphs: [
      p('移动|yídòng 互联网|hùliánwǎng 让|ràng 获取|huòqǔ 信息|xìnxī 变得|biànde 前所未有|qiánsuǒwèiyǒu 地|de 便捷|biànjié 。 人们|rénmen 习惯|xíguàn 利用|lìyòng 等车|děng_chē 、 排队|páiduì 的|de 几分钟|jǐ_fēnzhōng 浏览|liúlǎn 简短|jiǎnduǎn 的|de 资讯|zīxùn 或|huò 短视频|duǎnshìpín 。 这种|zhèzhǒng “碎片化|suìpiànhuà 阅读|yuèdú” 虽然|suīrán 拓宽|tuòkuān 了|le 视野|shìyě ， 却|què 也|yě 容易|róngyì 让人|ràng_rén 停留|tíngliú 在|zài 浅层|qiǎncéng 信息|xìnxī 表面|biǎomiàn 。'),
      p('如果|rúguǒ 长期|chángqī 缺乏|quēfá 系统|xìtǒng 的|de 经典|jīngdiǎn 阅读|yuèdú 和|hé 独立|dúlì 思考|sīkǎo ， 大脑|dànǎo 就|jiù 会|huì 逐渐|zhújiàn 失去|shīqù 处理|chǔlǐ 复杂|fùzá 逻辑|luójí 的|de 耐心|nàixīn 。 因此|yīncǐ ， 每天|měitiān 为|wèi 自己|zìjǐ 留出|liúchū 一段|yí_duàn 不被|bú_bèi 打扰|dǎrǎo 的|de 整块|zhěngkuài 时间|shíjiān 进行|jìnxíng 深度|shēndù 阅读|yuèdú ， 在|zài 信息|xìnxī 爆炸|bàozhà 的|de 时代|shídài 显得|xiǎnde 弥足珍贵|mízú-zhēnguì 。')
    ],
    questions: [
      {
        stem: '作者认为“碎片化阅读”有什么利弊？',
        options: ['虽能拓宽视野、方便快捷，但容易让人停留在浅层信息表面', '没有任何好处，还会损坏手机屏幕', '能够完全替代大学里的专业课程学习', '能让人在几分钟内成为各个领域的专家'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 这种“碎片化阅读”虽然拓宽了视野，却也容易让人停留在浅层信息表面。'
      },
      {
        stem: '长期缺乏系统阅读和独立思考会导致什么结果？',
        options: ['大脑逐渐失去处理复杂逻辑的耐心', '记忆力会自动提高十倍', '再也无法使用智能手机上网', '睡眠时间会比平时增加一倍'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 大脑就会逐渐失去处理复杂逻辑的耐心。'
      },
      {
        stem: '文中“弥足珍贵”的意思是：',
        options: ['更加显得非常宝贵、难得', '随处可见、毫无价值', '已经过时、不再需要', '让人感到十分困惑'],
        correctIndexes: [0],
        explanation: '“弥足珍贵” nghĩa làยิ่ง thêm vô cùng quý giá.'
      },
      {
        stem: '作者在文末提出了什么建议？',
        options: ['每天留出一段不被打扰的整块时间进行深度阅读', '彻底卸载手机里的所有新闻软件', '等车和排队时必须闭上眼睛休息', '只阅读字数在十万字以上的古代小说'],
        correctIndexes: [0],
        explanation: 'Câu cuối: 每天为自己留出一段不被打扰的整块时间进行深度阅读。'
      }
    ]
  },
  {
    id: 'p_hsk5_04',
    level: 5,
    setIndex: 4,
    title: '职场中的倾听艺术',
    paragraphs: [
      p('谈到|tándào 沟通|gōutōng 能力|nénglì ， 许多人|xǔduō_rén 首先|shǒuxiān 想到|xiǎngdào 的|de 是|shì 口才|kǒucái 流利|liúlì 、 能言善辩|néngyán-shànbiàn 。 其实|qíshí ， 在|zài 职场|zhíchǎng 合作|hézuò 中|zhōng ， “倾听|qīngtīng” 往往|wǎngwǎng 比|bǐ “诉说|sùshuō” 更具|gèng_jù 力量|lìliang 。 耐心|nàixīn 听完|tīng_wán 同事|tóngshì 或|huò 客户|kèhù 的|de 表达|biǎodá ， 是|shì 理解|lǐjiě 对方|duìfāng 真实|zhēnshí 需求|xūqiú 的|de 前提|qiántí 。'),
      p('高质量|gāo_zhìliàng 的|de 倾听|qīngtīng 并非|bìngfēi 沉默|chénmò 不语|bù_yǔ ， 而是|érshì 带着|dàizhe 尊重|zūnzhòng 与|yǔ 好奇|hàoqí ， 在|zài 恰当|qiàdàng 的|de 时机|shíjī 给予|jǐyǔ 眼神|yǎnshén 回应|huíyìng 或|huò 简短|jiǎnduǎn 提问|tíwèn 。 当|dāng 对方|duìfāng 感受到|gǎnshòu_dào 自己|zìjǐ 被|bèi 真诚|zhēnchéng 理解|lǐjiě 时|shí ， 信任|xìnrèn 与|yǔ 共识|gòngshí 便|biàn 会|huì 水到渠成|shuǐdào-qúchéng 。')
    ],
    questions: [
      {
        stem: '作者对“沟通能力”有什么核心看法？',
        options: ['在职场合作中，学会耐心倾听往往比能言善辩更重要', '沟通能力完全取决于一个人的说话速度', '在会议上说话声音最大的人最受尊重', '倾听就是全程一言不发、不做任何反应'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 在职场合作中，“倾听”往往比“诉说”更具力量。'
      },
      {
        stem: '根据第二段，高质量的倾听应该包括哪些表现？（请选择2个正确答案）',
        options: ['带着尊重与好奇去理解对方', '在恰当时机给予眼神回应或简短提问', '不等对方说完就立刻打断并反驳', '一边听对方说话一边低头回复微信'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 带着尊重与好奇，在恰当的时机给予眼神回应或简短提问。'
      },
      {
        stem: '文中“水到渠成”的意思是：',
        options: ['条件成熟了，事情自然而然地顺利达成', '修建水渠需要耗费大量资金', '双方的意见分歧越来越严重', '必须通过激烈的争吵才能达成协议'],
        correctIndexes: [0],
        explanation: 'Thành ngữ “水到渠成” nghĩa là nước chảy thành kênh — khi điều kiện chín muồi thì kết quả tự nhiên đạt được.'
      },
      {
        stem: '耐心听完同事或客户的表达有什么重要意义？',
        options: ['是准确理解对方真实需求并建立信任的前提', '可以拖延会议时间从而少做工作', '能让对方觉得自己没有任何主见', '可以避免在工作中承担任何责任'],
        correctIndexes: [0],
        explanation: 'Đoạn 1 & 2: 是理解对方真实需求的前提，建立信任与共识。'
      }
    ]
  },

  // ==================== HSK 6 (4 ĐOẠN) ====================
  {
    id: 'p_hsk6_01',
    level: 6,
    setIndex: 1,
    title: '非物质文化遗产的活态传承',
    paragraphs: [
      p('非物质文化遗产|fēiwùzhì_wénhuà_yíchǎn 承载|chéngzài 着|zhe 一个|yí_gè 民族|mínzú 的|de 历史|lìshǐ 记忆|jìyì 与|yǔ 审美|shěnměi 智慧|zhìhuì 。 然而|rán’ér ， 单纯|dānchún 将|jiāng 传统|chuántǒng 技艺|jìyì 陈列|chénliè 在|zài 博物馆|bówùguǎn 里|lǐ ， 往往|wǎngwǎng 难以|nányǐ 真正|zhēnzhèng 延续|yánxù 其|qí 生命力|shēngmìnglì 。'),
      p('只有|zhǐyǒu 让|ràng 传统|chuántǒng 工艺|gōngyì 融入|róngrù 现代|xiàndài 生活|shēnghuó ， 结合|jiéhé 当代|dāngdài 设计|shèjì 与|yǔ 市场|shìchǎng 需求|xūqiú 进行|jìnxíng 创新|chuàngxīn ， 非遗|fēiyí 才能|cáinéng 在|zài 年轻人|niánqīngrén 群体|qúntǐ 中|zhōng 焕发|huànfā 新的|xīn_de 活力|huólì 。')
    ],
    questions: [
      {
        stem: '作者撰写这段文字的主要目的是什么？',
        options: ['强调非物质文化遗产需要融入现代生活并创新传承', '呼吁关闭所有展示传统技艺的博物馆', '说明传统工艺无法适应当代市场规律', '批评年轻人对传统文化缺乏任何兴趣'],
        correctIndexes: [0],
        explanation: 'Ý chính: Di sản văn hóa phi vật thể cần hòa nhập đời sống hiện đại và đổi mới phù hợp nhu cầu thị trường.'
      },
      {
        stem: '作者认为单纯把传统技艺陈列在博物馆里有什么局限？',
        options: ['往往难以真正延续其生命力', '会导致博物馆门票价格过高', '会让传统工艺变得过于商业化', '会破坏文物的原始结构'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 往往难以真正延续其生命力。'
      },
      {
        stem: '文中“焕发”一词最恰当的解释是：',
        options: ['重新展现出光彩与生机', '逐渐消失在历史长河中', '保持一成不变的古老样式', '引起社会各界的激烈争议'],
        correctIndexes: [0],
        explanation: '“焕发新的活力” là bừng lên sức sống mới.'
      },
      {
        stem: '怎样才能让非遗在年轻人群体中获得认可？（请选择2个正确答案）',
        options: ['让传统工艺融入现代生活', '结合当代设计与市场需求进行创新', '禁止现代设计师参与传统工艺改良', '把所有手工艺品封存起来不对外展示'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 融入现代生活 và 结合当代设计与市场需求进行创新。'
      }
    ]
  },
  {
    id: 'p_hsk6_02',
    level: 6,
    setIndex: 2,
    title: '信息茧房与认知的多样性',
    paragraphs: [
      p('在|zài 个性化|gèxìnghuà 推荐|tuījiàn 算法|suànfǎ 无处不在|wúchù-búzài 的|de 数字|shùzì 时代|shídài ， 平台|píngtái 总是|zǒngshì 根据|gēnjù 用户|yònghù 既往|jìwǎng 的|de 浏览|liúlǎn 偏好|piānhào 精准|jīngzhǔn 推送|tuīsòng 相似|xiāngsì 内容|nèiróng 。 久而久之|jiǔ’érjiǔzhī ， 人们|rénmen 便|biàn 容易|róngyì 陷入|xiànrù “信息|xìnxī 茧房|jiǎnfáng” ， 只|zhǐ 听见|tīngjiàn 与|yǔ 自己|zìjǐ 观点|guāndiǎn 一致|yízhì 的|de 回音|huíyīn 。'),
      p('这种|zhèzhǒng 同质化|tóngzhìhuà 的|de 信息|xìnxī 环境|huánjìng 非但|fēidàn 无助于|wúzhùyú 拓展|tuòzhǎn 认知|rènzhī 边界|biānjiè ， 反而|fǎn’ér 可能|kěnéng 加剧|jiājù 偏见|piānjiàn 与|yǔ 盲从|mángcóng 。 唯有|wéiyǒu 保持|bǎochí 开放|kāifàng 的|de 求知|qiúzhī 心态|xīntài ， 主动|zhǔdòng 接触|jiēchù 多元|duōyuán 视角|shìjiǎo 与|yǔ 跨领域|kuà_lǐngyù 知识|zhīshi ， 我们|wǒmen 才能|cáinéng 在|zài 纷繁|fēnfán 复杂|fùzá 的|de 舆论场|yúlùnchǎng 中|zhōng 保持|bǎochí 清醒|qīngxǐng 与|yǔ 理性|lǐxìng 。')
    ],
    questions: [
      {
        stem: '文中“信息茧房”是如何形成的？',
        options: ['算法持续推送与用户既有偏好相似的内容，导致接触的信息日趋单一', '互联网公司限制用户每天只能阅读一篇文章', '用户主动关闭了所有新闻网站只看纸质词典', '网络信号不稳定导致网页无法正常加载'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 平台根据用户既往的浏览偏好精准推送相似内容，久而久之便容易陷入“信息茧房”。'
      },
      {
        stem: '长期处于同质化的信息环境中会带来什么危害？',
        options: ['无助于拓展认知边界，反而可能加剧偏见与盲从', '会让计算机硬件的运算速度大幅下降', '会导致个人信息全部被公开到网上', '会让人在短时间内掌握过多跨学科知识'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 这种同质化的信息环境非但无助于拓展认知边界，反而可能加剧偏见与盲从。'
      },
      {
        stem: '为了打破“信息茧房”，作者建议我们应该怎么做？（请选择2个正确答案）',
        options: ['保持开放的求知心态', '主动接触多元视角与跨领域知识', '只关注和自己观点完全相同的人', '完全依赖推荐算法替自己做所有决定'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 唯有保持开放的求知心态，主动接触多元视角与跨领域知识。'
      },
      {
        stem: '第一段末尾的“回音”在文中比喻什么？',
        options: ['与自己原有观点高度一致、重复印证的声音和看法', '山谷或空旷房间里产生的物理声学反射', '音乐厅里交响乐团演奏的优美旋律', '客服中心自动回复的语音提示'],
        correctIndexes: [0],
        explanation: '“只听见与自己观点一致的回音” ẩn dụ hiện tượng buồng vang thông tin (echo chamber).'
      }
    ]
  },
  {
    id: 'p_hsk6_03',
    level: 6,
    setIndex: 3,
    title: '古建筑修复中的“修旧如旧”',
    paragraphs: [
      p('历史|lìshǐ 建筑|jiànzhù 是|shì 凝固|nínggù 的|de 岁月|suìyuè 史书|shǐshū ， 一砖一瓦|yìzhuān-yìwǎ 皆|jiē 镌刻|juānkè 着|zhe 特定|tèdìng 时代|shídài 的|de 营造|yíngzào 技艺|jìyì 与|yǔ 人文|rénwén 风貌|fēngmào 。 在|zài 文物|wénwù 修缮|xiūshàn 领域|lǐngyù ， “修旧如旧|xiū_jiù_rú_jiù” 是一条|shì_yì_tiáo 被|bèi 广泛|guǎngfàn 遵循|zūnxún 的|de 核心|héxīn 准则|zhǔnzé 。'),
      p('所谓|suǒwèi “修旧如旧|xiū_jiù_rú_jiù” ， 绝非|juéfēi 简单|jiǎndān 地|de 做旧|zuò_jiù 仿古|fǎnggǔ ， 而是|érshì 最大|zuìdà 限度|xiàndù 地|de 保留|bǎoliú 原有|yuányǒu 构件|gòujiàn 与|yǔ 历史|lìshǐ 痕迹|hénjì ， 采用|cǎiyòng 传统|chuántǒng 材料|cáiliào 和|hé 工艺|gōngyì 消除|xiāochú 结构|jiégòu 安全|ānquán 隐患|yǐnhuàn 。 唯有|wéiyǒu 敬畏|jìngwèi 历史|lìshǐ 的|de 真实性|zhēnshíxìng ， 古建筑|gǔ_jiànzhù 才能|cáinéng 跨越|kuàyuè 时空|shíkōng ， 向|xiàng 后人|hòurén 诉说|sùshuō 原汁原味|yuánzhī-yuánwèi 的|de 文明|wénmíng 故事|gùshi 。')
    ],
    questions: [
      {
        stem: '作者将历史建筑比作“凝固的岁月史书”，意在说明什么？',
        options: ['古建筑承载并记录了特定时代的营造技艺与人文历史价值', '古建筑的墙壁上都刻满了纸质历史教科书', '历史建筑一旦建成就会永远坚固不会损坏', '研究历史只需要看建筑外观，不需要读文献'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 一砖一瓦皆镌刻着特定时代的营造技艺与人文风貌。'
      },
      {
        stem: '根据第二段，“修旧如旧”的真正内涵是什么？（请选择2个正确答案）',
        options: ['最大限度保留原有构件与历史痕迹', '采用传统材料与工艺消除结构安全隐患', '把古建筑全部推倒后用钢筋水泥重建', '在古建筑表面涂满鲜艳的现代油漆'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 最大限度地保留原有构件与历史痕迹，采用传统材料和工艺消除结构安全隐患。'
      },
      {
        stem: '文中“原汁原味”形容的是什么？',
        options: ['保持事物本来的真实面貌与纯粹风韵', '饭馆烹饪的汤菜味道十分浓郁', '建筑材料没有经过任何安全检测', '模仿国外建筑风格的现代设计'],
        correctIndexes: [0],
        explanation: '“原汁原味的文明故事” chỉ giá trị văn hóa – lịch sử nguyên bản, chân thực.'
      },
      {
        stem: '这段文字主要倡导怎样的文物保护态度？',
        options: ['敬畏历史真实性，科学审慎地修缮与守护古建筑', '为了让古建筑更漂亮应当大胆改造成现代商业大厦', '任由古建筑自然风化倒塌而不做任何修缮', '用人工做旧的新建筑替代所有真实历史遗迹'],
        correctIndexes: [0],
        explanation: 'Ý chính toàn bài: Tôn trọng tính chân thực lịch sử (敬畏历史的真实性) trong trùng tu cổ kiến trúc.'
      }
    ]
  },
  {
    id: 'p_hsk6_04',
    level: 6,
    setIndex: 4,
    title: '韧性成长：如何面对人生中的不确定性',
    paragraphs: [
      p('人生|rénshēng 旅途|lǚtú 并非|bìngfēi 总是|zǒngshì 一帆风顺|yìfān-fēngshùn ， 突发|tūfā 的|de 变故|biàngù 与|yǔ 挫折|cuòzhé 常常|chángcháng 打乱|dǎluàn 我们|wǒmen 既定|jìdìng 的|de 规划|guīhuà 。 面对|miànduì 未知|wèizhī 与|yǔ 不确定性|bú_quèdìngxìng ， 有人|yǒurén 陷入|xiànrù 焦虑|jiāolǜ 与|yǔ 自责|zìzé ， 也有人|yě_yǒurén 展现出|zhǎnxiàn_chū 强大|qiángdà 的|de 心理|xīnlǐ 韧性|rènxìng 。'),
      p('所谓|suǒwèi 心理|xīnlǐ 韧性|rènxìng ， 并不是|bìng_búshì 对|duì 痛苦|tòngkǔ 麻木不仁|mámù-bùrén ， 而是|érshì 在|zài 接纳|jiēnà 现实|xiànshí 落差|luòchā 的|de 基础|jīchǔ 上|shàng ， 迅速|xùnsù 调整|tiáozhěng 认知|rènzhī 策略|cèlüè ， 从|cóng 逆境|nìjìng 中|zhōng 提炼|tíliàn 经验|jīngyàn 。 正如|zhèngrú 竹子|zhúzi 在|zài 狂风|kuángfēng 中|zhōng 弯而不折|wān_ér_bù_zhé ， 真正|zhēnzhèng 的|de 强者|qiángzhě 善于|shànyú 把|bǎ 危机|wēijī 转化为|zhuǎnhuà_wéi 自我|zìwǒ 迭代|diédài 的|de 契机|qìjī 。')
    ],
    questions: [
      {
        stem: '作者如何定义“心理韧性”？',
        options: ['接纳现实落差、迅速调整策略并从逆境中汲取成长经验的能力', '对任何困难和痛苦都麻木不仁、毫不在乎的态度', '永远不会遇到任何挫折和失败的幸运体质', '遇到困难时立刻放弃目标以避免受伤的做法'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 并不是对痛苦麻木不仁，而是在接纳现实落差的基础上，迅速调整认知策略，从逆境中提炼经验。'
      },
      {
        stem: '文中用“竹子在狂风中弯而不折”来比喻什么？',
        options: ['在巨大压力与逆境下依然保持弹性、不轻易崩溃的坚韧品格', '人在面对困难时应该毫无原则地妥协退让', '植物在恶劣天气下比人类更容易生存', '只有生活在南方的人才能拥有良好的心态'],
        correctIndexes: [0],
        explanation: 'Hình ảnh cây tre uốn mình trong gió bão nhưng không gãy ẩn dụ cho sức bật tâm lý (心理韧性).'
      },
      {
        stem: '文中“契机”一词的意思最接近于：',
        options: ['重要转折的机会或关键时机', '严峻的危险与阻碍', '预先签订的商业合同', '无法挽回的重大损失'],
        correctIndexes: [0],
        explanation: '“自我迭代的契机” là cơ hội/thời cơ bước ngoặt để nâng cấp bản thân.'
      },
      {
        stem: '根据文章，真正的强者在面对危机时会怎么做？（请选择2个正确答案）',
        options: ['接纳现实并迅速调整认知策略', '从逆境中提炼经验，将危机转化为成长契机', '长期陷入焦虑与自我否定无法自拔', '否认一切变化并拒绝做任何调整'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2 nêu rõ hai bước: 接纳现实落差、迅速调整认知策略 và 从逆境中提炼经验、把危机转化为契机。'
      }
    ]
  },

  // ==================== HSK 7 (4 ĐOẠN - CHUẨN HSK 3.0 CAO CẤP) ====================
  {
    id: 'p_hsk7_01',
    level: 7,
    setIndex: 1,
    title: '人工智能时代的跨学科人才培养',
    paragraphs: [
      p('随着|suízhe 生成式|shēngchéngshì 人工智能|réngōng_zhìnéng 在|zài 科研|kēyán 、 医疗|yīliáo 与|yǔ 制造|zhìzào 领域|lǐngyù 的|de 深度|shēndù 渗透|shèntòu ， 单一|dānyī 学科|xuékē 背景|bèijǐng 已|yǐ 难以|nányǐ 应对|yìngduì 复杂的|fùzá_de 现实|xiànshí 挑战|tiǎozhàn 。'),
      p('高等教育|gāoděng_jiàoyù 亟需|jíxū 打破|dǎpò 院系|yuànxì 壁垒|bìlěi ， 在|zài 夯实|hāngshí 数理|shùlǐ 与|yǔ 算法|suànfǎ 基础|jīchǔ 的|de 同时|tóngshí ， 培养|péiyǎng 学生的|xuéshēng_de 批判性|pīpànxìng 思维|sīwéi 、 伦理|lúnlǐ 意识|yìshí 与|yǔ 人文|rénwén 素养|sùyǎng 。')
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
        explanation: '“院系壁垒” là rào cản giữa các khoa/ngành; “打破院系壁垒” là xóa bỏ rào cản để đào tạo liên ngành.'
      },
      {
        stem: '根据文章，人工智能时代的高等教育应注重培养哪些能力？（请选择2个正确答案）',
        options: ['批判性思维与伦理意识', '数理算法基础与人文素养', '只背诵固定模板答案的能力', '完全依赖机器替代人类判断'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 夯实数理与算法基础，同时培养批判性思维、伦理意识与人文素养。'
      },
      {
        stem: '从文中可以推断出什么？',
        options: ['技术深度应用对人才的综合素质提出了更高要求', '生成式人工智能目前仅应用于娱乐行业', '传统单一专业教育模式无需任何改革', '算法能力可以完全替代人文关怀'],
        correctIndexes: [0],
        explanation: 'Suy luận từ tác động sâu rộng của AI tới giáo dục đại học.'
      }
    ]
  },
  {
    id: 'p_hsk7_02',
    level: 7,
    setIndex: 2,
    title: '银发经济与老龄化社会的制度创新',
    paragraphs: [
      p('人口|rénkǒu 老龄化|lǎolínghuà 既是|jìshì 全球|quánqiú 诸多|zhūduō 经济体|jīngjìtǐ 面临|miànlín 的|de 人口|rénkǒu 结构|jiégòu 转型|zhuǎnxíng 挑战|tiǎozhàn ， 亦|yì 蕴含|yùnhán 着|zhe 催生|cuīshēng “银发|yínfà 经济|jīngjì” 的|de 巨大|jùdà 契机|qìjī 。 现代|xiàndài 老年人|lǎoniánrén 的|de 需求|xūqiú 已|yǐ 从|cóng 传统的|chuántǒng_de 基本|jīběn 生活|shēnghuó 照料|zhàoliào ， 延伸|yánshēn 至|zhì 智慧|zhìhuì 医疗|yīliáo 、 康养|kāngyǎng 旅居|lǚjū 与|yǔ 终身|zhōngshēn 学习|xuéxí 等|děng 多元|duōyuán 层次|céngcì 。'),
      p('要|yào 将|jiāng 老龄化|lǎolínghuà 压力|yālì 转化为|zhuǎnhuà_wéi 高质量|gāo_zhìliàng 发展|fāzhǎn 动力|dònglì ， 不仅|bùjǐn 需要|xūyào 完善|wánshàn 养老|yǎnglǎo 保障|bǎozhàng 与|yǔ 长期|chángqī 照护|zhàohù 保险|bǎoxiǎn 制度|zhìdù ， 更|gèng 需|xū 推动|tuīdòng 城市|chéngshì 公共|gōnggòng 空间|kōngjiān 与|yǔ 数字|shùzì 产品|chǎnpǐn 的|de 适老化|shìlǎohuà 改造|gǎizào ， 让|ràng 长者|zhǎngzhě 在|zài 技术|jìshù 进步|jìnbù 中|zhōng 共享|gòngxiǎng 尊严|zūnyán 与|yǔ 便利|biànlì 。')
    ],
    questions: [
      {
        stem: '作者如何看待人口老龄化这一社会现象？',
        options: ['既是人口结构转型的挑战，也蕴含着发展银发经济的巨大契机', '只会给社会带来沉重负担，没有任何积极意义', '只发生在发展中国家，与发达经济体无关', '可以通过限制医疗技术发展来彻底解决'],
        correctIndexes: [0],
        explanation: 'Câu mở đầu: 人口老龄化既是人口结构转型挑战，亦蕴含着催生“银发经济”的巨大契机。'
      },
      {
        stem: '当代老年人的消费与生活需求呈现出怎样的变化趋势？',
        options: ['从基本生活照料延伸至智慧医疗、康养旅居与终身学习等多元层次', '只满足于最简单的温饱，拒绝一切现代科技服务', '完全不再需要任何医疗和社区护理服务', '消费水平全面超过所有年轻群体'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 已从传统的基本生活照料，延伸至智慧医疗、康养旅居与终身学习等多元层次。'
      },
      {
        stem: '文中“适老化改造”指的是什么？',
        options: ['根据老年人的生理与认知特点，优化公共设施与数字产品的使用体验', '把所有现代商场改建为传统的敬老院', '禁止老年人使用智能手机和互联网服务', '要求所有企业只招聘六十岁以上的员工'],
        correctIndexes: [0],
        explanation: '“适老化改造” là cải tạo không gian công cộng và sản phẩm số sao cho thân thiện, phù hợp với người cao tuổi.'
      },
      {
        stem: '为推动银发经济高质量发展，文章提出了哪些举措？（请选择2个正确答案）',
        options: ['完善养老保障与长期照护保险制度', '推动城市公共空间与数字产品的适老化改造', '取消所有针对老年群体的公共交通优惠', '关闭老年大学以减少财政支出'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2 nêu rõ hai trụ cột: hoàn thiện chế độ bảo hiểm chăm sóc dài hạn và cải tạo thích ứng người cao tuổi.'
      }
    ]
  },
  {
    id: 'p_hsk7_03',
    level: 7,
    setIndex: 3,
    title: '循环经济与绿色供应链转型',
    paragraphs: [
      p('在全球|zài_quánqiú 气候|qìhòu 治理|zhìlǐ 日趋|rìqū 紧迫|jǐnpò 的|de 背景|bèijǐng 下|xià ， 传统的|chuántǒng_de “开采|kāicǎi — 制造|zhìzào — 废弃|fèiqì” 线性|xiànxìng 增长|zēngzhǎng 模式|móshì 已|yǐ 难以为继|nányǐ-wéijì 。 循环|xúnhuán 经济|jīngjì 主张|zhǔzhāng 从|cóng 产品|chǎnpǐn 设计|shèjì 源头|yuántóu 考量|kǎoliáng 资源|zīyuán 的|de 全生命周期|quán_shēngmìng_zhōuqī ， 通过|tōngguò 回收|huíshōu 再生|zàishēng 与|yǔ 再制造|zài_zhìzào 实现|shíxiàn 资源|zīyuán 闭环|bìhuán 。'),
      p('对于|duìyú 制造|zhìzào 企业|qǐyè 而言|éryán ， 构建|gòujiàn 绿色|lǜsè 供应链|gōngyìngliàn 并非|bìngfēi 单纯|dānchún 的|de 合规|héguī 成本|chéngběn 负担|fùdān ， 而是|érshì 提升|tíshēng 能源|néngyuán 效率|xiàolǜ 、 规避|guībì 碳关税|tàn_guānshuì 壁垒|bìlěi 并|bìng 塑造|sùzào 长期|chángqī 品牌|pǐnpái 竞争力|jìngzhēnglì 的|de 战略|zhànlüè 支点|zhīdiǎn 。')
    ],
    questions: [
      {
        stem: '文中“难以为继”形容传统线性增长模式处于什么状态？',
        options: ['难以再继续维持下去，亟待转型', '发展势头强劲，短期内无法被超越', '刚刚处于起步阶段，尚未成熟', '虽然成本高昂但生态环境效益极佳'],
        correctIndexes: [0],
        explanation: '“难以为继” nghĩa là khó lòng duy trì tiếp tục được nữa.'
      },
      {
        stem: '循环经济的核心理念是什么？',
        options: ['从设计源头考量资源全生命周期，通过回收再生实现资源闭环', '尽可能多地开采自然资源并一次性消费完毕', '将所有工业废弃物转移到偏远地区填埋', '完全停止工业制造以实现零碳排放'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 从产品设计源头考量资源的全生命周期，通过回收再生与再制造实现资源闭环。'
      },
      {
        stem: '构建绿色供应链对制造企业有哪些战略价值？（请选择2个正确答案）',
        options: ['提升能源效率并规避碳关税壁垒', '塑造企业长期的品牌竞争力', '可以免除企业一切产品质量责任', '让企业无需再进行任何技术研发'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 提升能源效率、规避碳关税壁垒并塑造长期品牌竞争力的战略支点。'
      },
      {
        stem: '作者对企业环保投入持什么态度？',
        options: ['认为绿色转型不是单纯的成本负担，而是提升竞争力的战略投资', '认为环保合规只会拖垮制造企业的利润', '认为只有跨国巨头才需要考虑碳排放问题', '认为循环经济只是理论概念，无法在工业中落地'],
        correctIndexes: [0],
        explanation: 'Đoạn 2 khẳng định rõ: 并非单纯的合规成本负担，而是……战略支点。'
      }
    ]
  },
  {
    id: 'p_hsk7_04',
    level: 7,
    setIndex: 4,
    title: '方言保护与文化生态的多样性',
    paragraphs: [
      p('通用语|tōngyòngyǔ 的|de 推广|tuīguǎng 极大地|jídà_de 降低|jiàngdī 了|le 跨地域|kuà_dìyù 沟通|gōutōng 成本|chéngběn ， 促进|cùjìn 了|le 现代|xiàndài 社会|shèhuì 的|de 经济|jīngjì 融合|rónghé 。 然而|rán’ér ， 作为|zuòwéi 地域|dìyù 文化|wénhuà 活化石|huóhuàshí 的|de 各地方言|gèdì_fāngyán ， 却|què 在|zài 城市化|chéngshìhuà 浪潮|làngcháo 中|zhōng 面临|miànlín 使用|shǐyòng 人口|rénkǒu 萎缩|wěisuō 的|de 困境|kùnjìng 。'),
      p('方言|fāngyán 绝非|juéfēi 仅仅|jǐnjǐn 是|shì 发音|fāyīn 上|shàng 的|de 差异|chāyì ， 它|tā 保留|bǎoliú 了|le 大量|dàliàng 古汉语|gǔ_Hànyǔ 词汇|cíhuì ， 更|gèng 孕育|yùnyù 了|le 地方|dìfang 戏曲|xìqǔ 、 民谣|mínyáo 与|yǔ 独特|dútè 的|de 民间|mínjiān 叙事|xùshì 方式|fāngshì 。 运用|yùnyòng 数字化|shùzìhuà 语音|yǔyīn 建档|jiàndàng 并|bìng 鼓励|gǔlì 方言|fāngyán 文艺|wényì 创作|chuàngzuò ， 是|shì 守护|shǒuhù 中华|Zhōnghuá 文化|wénhuà 生态|shēngtài 多样性|duōyàngxìng 的|de 应有之义|yīngyǒu-zhīyì 。')
    ],
    questions: [
      {
        stem: '第一段指出推广通用语与各地方言分别处于怎样的境况？',
        options: ['通用语促进了跨地域沟通融合，而方言在城市化中面临使用人口萎缩', '方言已经完全取代了通用语在学校教育中的地位', '推广通用语与保护方言是完全对立、不可兼得的', '城市化浪潮让所有方言的使用人数都增加了十倍'],
        correctIndexes: [0],
        explanation: 'Đoạn 1 nêu rõ vai trò của ngôn ngữ phổ thông và thách thức thu hẹp người dùng của phương ngữ.'
      },
      {
        stem: '作者为什么称方言为“地域文化活化石”？（请选择2个正确答案）',
        options: ['保留了大量古汉语词汇', '孕育了地方戏曲、民谣与独特的民间叙事方式', '所有方言都必须刻在石头上才能保存', '方言没有任何语法规则和词汇系统'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 它保留了大量古汉语词汇，更孕育了地方戏曲、民谣与独特的民间叙事方式。'
      },
      {
        stem: '文中“应有之义”的意思是：',
        options: ['理所当然包含在内的道理或必须承担的责任', '完全多余、没有必要的举措', '引发学术界争议的模糊概念', '暂时无法实现的幻想'],
        correctIndexes: [0],
        explanation: '“应有之义” nghĩa là điều tất yếu, trách nhiệm đương nhiên phải có.'
      },
      {
        stem: '文章建议采取什么措施来保护方言文化？',
        options: ['运用数字化语音建档并鼓励方言文艺创作', '强制要求所有外地人只准说当地土话', '在各级学校全面停止推广普通话', '将地方戏曲完全改编为西方歌剧'],
        correctIndexes: [0],
        explanation: 'Câu cuối: 运用数字化语音建档并鼓励方言文艺创作。'
      }
    ]
  },

  // ==================== HSK 8 (4 ĐOẠN - CHUẨN HSK 3.0 CAO CẤP) ====================
  {
    id: 'p_hsk8_01',
    level: 8,
    setIndex: 1,
    title: '数字人文：当古典文献遇见计算科学',
    paragraphs: [
      p('“数字人文|shùzì_rénwén” 的|de 兴起|xīngqǐ ， 正在|zhèngzài 重塑|chóngsù 传统|chuántǒng 文史|wénshǐ 研究|yánjiū 的|de 范式|fànshì 。 借助|jièzhù 光学|guāngxué 字符|zìfú 识别|shíbié 、 自然|zìrán 语言|yǔyán 处理|chǔlǐ 与|yǔ 知识|zhīshi 图谱|túpǔ 技术|jìshù ， 浩如烟海|hàorú-yānhǎi 的|de 古代|gǔdài 典籍|diǎnjí 得以|déyǐ 转化为|zhuǎnhuà_wéi 可|kě 检索|jiǎnsuǒ 、 可|kě 量化|liànghuà 分析|fēnxī 的|de 结构化|jiégòuhuà 数据|shùjù 。'),
      p('这|zhè 不仅|bùjǐn 让|ràng 学者|xuézhě 能够|nénggòu 在|zài 宏观|hóngguān 尺度|chǐdù 上|shàng 追踪|zhuīzōng 观念|guānniàn 演进|yǎnjìn 与|yǔ 社会|shèhuì 网络|wǎngluò 变迁|biànqiān ， 也|yě 促使|cùshǐ 人文|rénwén 考据|kǎojù 与|yǔ 实证|shízhèng 统计|tǒngjì 相互|xiānghù 印证|yìnzhèng 。 然而|rán’ér ， 算法|suànfǎ 终究|zhōngjiū 是|shì 辅助|fǔzhù 工具|gōngjù ， 对|duì 文本|wénběn 幽微|yōuwēi 意涵|yìhán 的|de 体悟|tǐwù 与|yǔ 历史|lìshǐ 同情之理解|tóngqíng_zhī_lǐjiě ， 依然|yīrán 仰赖|yǎnglài 学人|xuérén 深厚|shēnhòu 的|de 学养|xuéyǎng 。')
    ],
    questions: [
      {
        stem: '“数字人文”给传统文史研究带来了什么重大变革？',
        options: ['将海量古籍转化为结构化数据，实现宏观量化分析与传统考据相互印证', '用计算机彻底取代了历史学家的思考与判断', '证明了所有古代典籍的记载都是错误的', '使文史研究不再需要阅读任何原始文献'],
        correctIndexes: [0],
        explanation: 'Đoạn 1 & 2: Chuyển hóa cổ tịch thành dữ liệu có cấu trúc, kết hợp phân tích định lượng vĩ mô với khảo cứu truyền thống.'
      },
      {
        stem: '文中“浩如烟海”用来形容什么？',
        options: ['古代典籍与文献数量极其庞大、繁多', '大海上的烟雾十分浓厚看不清方向', '计算机算法的编程代码非常复杂', '研究数字人文的学者人数众多'],
        correctIndexes: [0],
        explanation: 'Thành ngữ “浩如烟海”形容书籍、文献等数量极多，广大如烟海。'
      },
      {
        stem: '作者在第二段后半部分强调了什么审慎观点？',
        options: ['算法只是辅助工具，对文本深层意涵的体悟仍仰赖学者的人文学养', '自然语言处理技术已经能够完全理解古诗文的全部审美意境', '传统人文考据方法已经过时，应当被统计学全面淘汰', '知识图谱技术没有任何学术研究价值'],
        correctIndexes: [0],
        explanation: 'Câu cuối: 然而，算法终究是辅助工具，对文本幽微意涵的体悟……依然仰赖学人深厚的学养。'
      },
      {
        stem: '根据文章，数字人文技术主要融合了哪些计算机方法？（请选择2个正确答案）',
        options: ['光学字符识别与自然语言处理', '知识图谱与结构化数据分析', '核聚变发电与重工业冶炼', '生物基因编辑与临床外科手术'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 1: 借助光学字符识别、自然语言处理与知识图谱技术……转化为结构化数据。'
      }
    ]
  },
  {
    id: 'p_hsk8_02',
    level: 8,
    setIndex: 2,
    title: '精准医疗与基因伦理的边界',
    paragraphs: [
      p('以|yǐ 基因组|jīyīnzǔ 测序|cèxù 和|hé 靶向|bǎxiàng 治疗|zhìliáo 为|wéi 代表|dàibiǎo 的|de 精准|jīngzhǔn 医疗|yīliáo ， 正在|zhèngzài 打破|dǎpò 传统|chuántǒng 医学|yīxué “千人一方|qiānrén-yìfāng” 的|de 局限|júxiàn 。 通过|tōngguò 解析|jiěxī 个体|gètǐ 的|de 遗传|yíchuán 变异|biànyì 与|yǔ 代谢|dàixiè 特征|tèzhēng ， 临床|línchuáng 医生|yīshēng 得以|déyǐ 量身定制|liángshēn-dìngzhì 最优|zuìyōu 诊疗|zhěnliáo 方案|fāng’àn ， 显著|xiǎnzhù 提高|tígāo 罕见病|hǎnjiànbìng 与|yǔ 恶性|èxìng 肿瘤|zhǒngliú 的|de 治愈率|zhìyùlǜ 。'),
      p('但|dàn 与此同时|yǔcǐ-tóngshí ， 基因|jīyīn 数据|shùjù 的|de 隐私|yǐnsī 保护|bǎohù 、 保险|bǎoxiǎn 就业|jiùyè 中的|zhōng_de “基因|jīyīn 歧视|qíshì” 风险|fēngxiǎn ， 以及|yǐjí 生殖系|shēngzhíxì 基因|jīyīn 编辑|biānjí 的|de 伦理|lúnlǐ 红线|hóngxiàn ， 亦|yì 引发|yǐnfā 了|le 全球|quánqiú 科学界|kēxuéjiè 与|yǔ 法学界|fǎxuéjiè 的|de 深切|shēnqiè 审视|shěnshì 。 技术|jìshù 狂飙|kuángbiāo 突进|tūjìn 之时|zhīshí ， 唯有|wéiyǒu 筑牢|zhùláo 法律|fǎlǜ 与|yǔ 伦理|lúnlǐ 的|de 堤坝|dībà ， 医学|yīxué 创新|chuàngxīn 方能|fāngnéng 真正|zhēnzhèng 造福|zàofú 人类|rénlèi 。')
    ],
    questions: [
      {
        stem: '文中“千人一方”指的是传统医学的什么局限？',
        options: ['对不同个体特征的患者采用相同或单一的标准化治疗方案', '一个医生每天需要接诊一千名病人', '一张中药处方里包含上千种药材', '医院的药品价格统一为固定数额'],
        correctIndexes: [0],
        explanation: '“千人一方” chỉ cách điều trị đồng loạt một phác đồ cho mọi bệnh nhân mà chưa cá thể hóa theo đặc điểm di truyền.'
      },
      {
        stem: '精准医疗是如何提升临床诊疗效果的？',
        options: ['解析个体遗传变异与代谢特征，为患者量身定制最优方案', '完全取消手术与药物治疗，仅靠心理安慰', '让患者自行在家通过网络搜索开具处方', '对所有疾病都使用同一种广谱抗生素'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 通过解析个体的遗传变异与代谢特征，临床医生得以量身定制最优诊疗方案。'
      },
      {
        stem: '根据第二段，基因技术的发展引发了哪些伦理与法律隐忧？（请选择2个正确答案）',
        options: ['基因数据隐私泄露与“基因歧视”风险', '生殖系基因编辑触碰人类伦理红线', '导致传统听诊器和血压计价格暴涨', '使医院不再需要任何专业护理人员'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 基因数据的隐私保护、保险就业中的“基因歧视”风险，以及生殖系基因编辑的伦理红线。'
      },
      {
        stem: '文末“筑牢法律与伦理的堤坝”运用了什么修辞手法，表达了什么观点？',
        options: ['比喻修辞，强调必须以严密的法律法规和伦理规范约束并引导医学技术发展', '夸张修辞，说明医院应该建在远离江河防洪堤的地方', '拟人修辞，主张彻底禁止一切基因测序与靶向治疗研究', '反问修辞，认为法律和伦理只会阻碍医学科学的进步'],
        correctIndexes: [0],
        explanation: 'Ẩn dụ “堤坝” (con đê) nhấn mạnh khung pháp lý và đạo đức giúp định hướng đổi mới y học an toàn.'
      }
    ]
  },
  {
    id: 'p_hsk8_03',
    level: 8,
    setIndex: 3,
    title: '行为经济学视角下的“助推”理论',
    paragraphs: [
      p('传统|chuántǒng 经济学|jīngjìxué 往往|wǎngwǎng 假设|jiǎshè 人|rén 是|shì 完全|wánquán 理性|lǐxìng 的|de 决策者|juécèzhě ， 然而|rán’ér 行为|xíngwéi 经济学|jīngjìxué 的|de 大量|dàliàng 实证|shízhèng 研究|yánjiū 表明|biǎomíng ， 人类|rénlèi 的|de 日常|rìcháng 判断|pànduàn 常|cháng 受|shòu 认知|rènzhī 偏差|piānchā 、 锚定|máodìng 效应|xiàoyìng 与|yǔ 损失|sǔnshī 厌恶|yànwù 的|de 支配|zhīpèi 。'),
      p('基于|jīyú 此|cǐ ， 诺贝尔奖|Nuòbèi’ěrjiǎng 得主|dézhǔ 塞勒|Sāilēi 提出|tíchū 了|le “助推|zhùtuī” 理论|lǐlùn ： 在|zài 不|bù 强制|qiángzhì 剥夺|bōduó 个体|gètǐ 选择权|xuǎnzéquán 、 也|yě 不|bù 显著|xiǎnzhù 改变|gǎibiàn 经济|jīngjì 激励|jīlì 的|de 前提|qiántí 下|xià ， 仅|jǐn 通过|tōngguò 优化|yōuhuà “选择|xuǎnzé 架构|jiàgòu” （ 如|rú 将|jiāng 健康|jiànkāng 食品|shípǐn 摆在|bǎi_zài 视线|shìxiàn 平齐|píngqí 处|chù ， 或|huò 将|jiāng 养老金|yǎnglǎojīn 储蓄|chǔxù 设为|shè_wéi 默认|mòrèn 选项|xuǎnxiàng ） ， 便|biàn 能|néng 潜移默化|qiányí-mòhuà 地|de 引导|yǐndǎo 人们|rénmen 做出|zuòchū 更|gèng 有利于|yǒulì_yú 自身|zìshēn 与|yǔ 社会|shèhuì 福祉|fúzhǐ 的|de 决定|juédìng 。')
    ],
    questions: [
      {
        stem: '行为经济学与传统经济学在关于“人”的假设上有何根本分歧？',
        options: ['传统经济学假设人完全理性，而行为经济学指出人的判断常受认知偏差支配', '传统经济学认为人不需要金钱，而行为经济学认为人只看重物质奖励', '两者没有任何分歧，都认为人类的每一次决策都精确无误', '行为经济学认为人类没有任何自主意识，完全无法做决定'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 传统经济学往往假设人是完全理性的决策者，然而行为经济学……表明人类的日常判断常受认知偏差、锚定效应与损失厌恶的支配。'
      },
      {
        stem: '根据第二段，“助推（Nudge）”策略的核心特征有哪些？（请选择2个正确答案）',
        options: ['不强制剥夺个体的自由选择权', '通过优化“选择架构”潜移默化地引导有益决策', '通过高额罚款强迫民众必须购买指定商品', '完全取消消费者的所有其他备选方案'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 在不强制剥夺个体选择权、也不显著改变经济激励的前提下，仅通过优化“选择架构”……引导人们做出决定。'
      },
      {
        stem: '文中列举了哪两个应用“选择架构”的实例？',
        options: ['将健康食品摆在视线平齐处、将养老金储蓄设为默认选项', '对垃圾食品征收十倍重税、关闭所有甜品店', '强制扣除员工一半工资购买股票、禁止提前支取', '用抽奖活动吸引顾客购买高价奢侈品'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 如将健康食品摆在视线平齐处，或将养老金储蓄设为默认选项。'
      },
      {
        stem: '文中“潜移默化”的意思是：',
        options: ['在不知不觉中受到感染或影响而发生改变', '采取强硬的行政命令立刻改变结果', '偷偷转移别人的财产或数据', '在公开场合进行激烈的辩论'],
        correctIndexes: [0],
        explanation: '“潜移默化” nghĩa là tác động, chuyển hóa một cách tự nhiên, thấm dần mà không hề cưỡng ép.'
      }
    ]
  },
  {
    id: 'p_hsk8_04',
    level: 8,
    setIndex: 4,
    title: '深海科考与地球生命起源之谜',
    paragraphs: [
      p('长期|chángqī 以来|yǐlái ， 科学界|kēxuéjiè 普遍|pǔbiàn 认为|rènwéi “万物|wànwù 生长|shēngzhǎng 靠|kào 太阳|tàiyáng” ， 光合作用|guānghé_zuòyòng 是|shì 地球|dìqiú 生态系统|shēngtài_xìtǒng 唯一|wéiyī 的|de 能量|néngliàng 基石|jīshí 。 然而|rán’ér ， 深海|shēnhǎi 热液|rèyè 喷口|pēnkǒu （ “黑烟囱|hēiyāncōng” ） 群落|qúnluò 的|de 发现|fāxiàn ， 彻底|chèdǐ 颠覆|diānfù 了|le 这一|zhè_yī 传统|chuántǒng 认知|rènzhī 。'),
      p('在|zài 阳光|yángguāng 无法|wúfǎ 企及|qǐjí 、 高压|gāoyā 缺氧|quēyǎng 且|qiě 富含|fùhán 剧毒|jùdú 硫化物|liúhuàwù 的|de 数千米|shù_qiān_mǐ 海底|hǎidǐ ， 化能|huànéng 自养|zìyǎng 微生物|wēishēngwù 竟|jìng 能|néng 利用|lìyòng 地热|dìrè 化学能|huàxué_néng 合成|héchéng 有机物|yǒujīwù ， 支撑|zhīchēng 起|qǐ 管状蠕虫|guǎnzhuàng_rúchóng 、 盲虾|mángxiā 等|děng 繁盛|fánshèng 的|de 黑暗|hēi’àn 生物圈|shēngwùquān 。 这一|zhè_yī 发现|fāxiàn 不仅|bùjǐn 为|wèi 探索|tànsuǒ 地球|dìqiú 早期|zǎoqī 生命|shēngmìng 起源|qǐyuán 打开|dǎkāi 了|le 全新|quánxīn 窗口|chuāngkǒu ， 也|yě 为|wèi 搜寻|sōuxún 地外|dìwài 海洋|hǎiyáng 星球|xīngqiú 的|de 生命|shēngmìng 迹象|jìxiàng 提供|tígōng 了|le 重要|zhòngyào 参照|cānzhào 。')
    ],
    questions: [
      {
        stem: '深海热液喷口群落的发现颠覆了科学界的什么传统认知？',
        options: ['颠覆了“光合作用是地球生态系统唯一能量基石”的传统认知', '颠覆了“地球表面大部分被海洋覆盖”的地理常识', '证明了太阳光可以直接照亮一万米深的海底', '证明了深海里没有任何微生物和动物能够存活'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 科学界普遍认为“万物生长靠太阳”，光合作用是地球生态系统唯一的能量基石。然而，深海热液喷口群落的发现，彻底颠覆了这一传统认知。'
      },
      {
        stem: '深海热液喷口附近的黑暗生物圈依靠什么获取初级能量？',
        options: ['依靠化能自养微生物利用地热化学能合成有机物', '依靠海面漂浮下来的绿色植物叶片进行光合作用', '依靠人造潜水器定期投放的营养物质', '依靠吸收海底核反应堆泄漏的电能'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 化能自养微生物竟能利用地热化学能合成有机物，支撑起……繁盛的黑暗生物圈。'
      },
      {
        stem: '文中“企及”的意思是：',
        options: ['达到、赶上（文中指阳光无法照射到达）', '企图控制或占领', '站在高处远远眺望', '快速逃离危险区域'],
        correctIndexes: [0],
        explanation: '“阳光无法企及” nghĩa là ánh nắng mặt trời không thể vươn tới / chạm tới.'
      },
      {
        stem: '研究深海“黑烟囱”生态系统具有哪些深远的科学意义？（请选择2个正确答案）',
        options: ['为探索地球早期生命起源打开全新窗口', '为搜寻地外海洋星球的生命迹象提供重要参照', '可以立刻将人类城市整体搬迁到数千米海底', '能够让所有陆地植物不再需要阳光和水分'],
        correctIndexes: [0, 1],
        explanation: 'Câu cuối nêu rõ hai ý nghĩa khoa học đối với nguồn gốc sự sống Trái Đất và tìm kiếm sự sống ngoài hành tinh.'
      }
    ]
  },

  // ==================== HSK 9 (4 ĐOẠN - CHUẨN HSK 3.0 ĐỈNH CAO) ====================
  {
    id: 'p_hsk9_01',
    level: 9,
    setIndex: 1,
    title: '东方美学中的“留白”意境',
    paragraphs: [
      p('在|zài 中国|Zhōngguó 传统|chuántǒng 书画|shūhuà 、 园林|yuánlín 建筑|jiànzhù 乃至|nǎizhì 古典|gǔdiǎn 诗词|shīcí 中|zhōng ， “留白|liúbái” 皆|jiē 是|shì 一种|yì_zhǒng 极具|jí_jù 哲思|zhésī 的|de 艺术|yìshù 手法|shǒufǎ 。 画卷|huàjuàn 上|shàng 未着|wèi_zhuó 笔墨|bǐmò 之|zhī 处|chù ， 并非|bìngfēi 苍白|cāngbái 的|de 空洞|kōngdòng ， 而是|érshì 烟波|yānbō 、 云霭|yún’ǎi 或|huò 无垠|wúyín 的|de 天地|tiāndì ， 所谓|suǒwèi “虚实|xū-shí 相生|xiāngshēng ， 无画处|wú_huà_chù 皆成|jiē_chéng 妙境|miàojìng” 。'),
      p('这种|zhèzhǒng “以无胜有|yǐ_wú_shèng_yǒu” 的|de 审美|shěnměi 智慧|zhìhuì ， 突破|tūpò 了|le 有限|yǒuxiàn 形质|xíngzhì 的|de 束缚|shùfù ， 将|jiāng 诠释|quánshì 的|de 主动权|zhǔdòngquán 让渡|ràngdù 给|gěi 观者|guānzhě 的|de 想象力|xiǎngxiànglì 。 置于|zhìyú 喧嚣|xuānxiāo 浮躁|fúzào 的|de 现代|xiàndài 生活|shēnghuó ， “留白|liúbái” 亦|yì 是|shì 一种|yì_zhǒng 人生|rénshēng 境界|jìngjiè ： 懂得|dǒngde 在|zài 密不透风|mìbútòufēng 的|de 日程|rìchéng 中|zhōng 辟出|pìchū 片刻|piànkè 闲暇|xiánxiá ， 方能|fāngnéng 安顿|āndùn 心灵|xīnlíng ， 涵养|hányǎng 从容|cóngróng 与|yǔ 远见|yuǎnjiàn 。')
    ],
    questions: [
      {
        stem: '文中引用“虚实相生，无画处皆成妙境”意在阐明什么美学原则？',
        options: ['画卷上的留白并非空无一物，而是与笔墨实景相辅相成、引发无穷意境', '画家因为纸张不够大或颜料用完才留下空白', '最好的画作应该是一张完全不画任何线条的白纸', '中国传统绘画完全不注重具体景物的描绘'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: Khoảng trống không phải sự trống rỗng vô nghĩa mà tạo nên mây khói, trời đất, hư thực tương sinh.'
      },
      {
        stem: '“留白”艺术在审美互动上具有什么独特效果？',
        options: ['突破有限形质的束缚，将审美诠释与想象的空间赋予观者', '强制要求所有观众得出完全一致的标准答案', '让作品含义变得晦涩难懂，拒绝普通大众欣赏', '用密集的色彩填满画布的每一个角落'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 突破了有限形质的束缚，将诠释的主动权让渡给观者的想象力。'
      },
      {
        stem: '作者将“留白”从艺术延伸至现代人生境界，旨在倡导什么生活态度？（请选择2个正确答案）',
        options: ['在忙碌紧凑的日程中主动留出片刻闲暇以安顿心灵', '克服浮躁，在适度停顿中涵养从容心态与长远眼光', '放弃一切社会责任与工作，终日无所事事', '把日程表排得密不透风以追求极致效率'],
        correctIndexes: [0, 1],
        explanation: 'Câu cuối: 懂得在密不透风的日程中辟出片刻闲暇，方能安顿心灵，涵养从容与远见。'
      },
      {
        stem: '文中“让渡”一词的准确含义是：',
        options: ['将某种权利、空间或主导权转移、赋予他人', '乘船渡过宽阔的江河', '在争论中毫无底线地妥协退让', '把商品以极低的价格出售'],
        correctIndexes: [0],
        explanation: '“将诠释的主动权让渡给观者的想象力” nghĩa là trao/nhường quyền chủ động cảm thụ cho trí tưởng tượng của người thưởng thức.'
      }
    ]
  },
  {
    id: 'p_hsk9_02',
    level: 9,
    setIndex: 2,
    title: '技术理性与人文精神的张力与共生',
    paragraphs: [
      p('自|zì 工业革命|gōngyè_gémìng 以来|yǐlái ， 以|yǐ 效率|xiàolǜ 、 可计算性|kě_jìsuànxìng 与|yǔ 可控性|kěkòngxìng 为|wéi 核心|héxīn 的|de “技术|jìshù 理性|lǐxìng” 推动|tuīdòng 人类|rénlèi 物质|wùzhì 文明|wénmíng 取得了|qǔdé_le 突飞猛进|tūfēi-měngjìn 的|de 跨越|kuàyuè 。 然而|rán’ér ， 当|dāng 工具|gōngjù 理性|lǐxìng 无限|wúxiàn 膨胀|péngzhàng 并|bìng 僭越|jiànyuè 价值|jiàzhí 理性|lǐxìng 时|shí ， 人|rén 便|biàn 面临|miànlín 被|bèi 异化|yìhuà 为|wéi 数据|shùjù 节点|jiédiǎn 与|yǔ 效率|xiàolǜ 齿轮|chǐlún 的|de 危机|wēijī 。'),
      p('科学|kēxué 求“真”|qiú_zhēn ， 解决|jiějué 的|de 是|shì “能不能|néng_bu_néng” 的|de 手段|shǒuduàn 问题|wèntí ； 人文|rénwén 求“善”|qiú_shàn 与|yǔ “美”|měi ， 追问|zhuīwèn 的|de 是|shì “应不应该|yīng_bu_yīnggāi” 的|de 终极|zhōngjí 价值|jiàzhí 归宿|guīsù 。 健康的|jiànkāng_de 现代|xiàndài 文明|wénmíng 绝非|juéfēi 科技|kējì 对|duì 人文|rénwén 的|de 单向|dānxiàng 征服|zhēngfú ， 而是|érshì 两者|liǎngzhě 在|zài 保持|bǎochí 必要|bìyào 张力|zhānglì 中|zhōng 实现|shíxiàn 双向|shuāngxiàng 校准|jiàozhǔn ： 以|yǐ 科技|kējì 赋能|fùnéng 人类|rénlèi 解放|jiěfàng ， 以|yǐ 人文|rénwén 照亮|zhàoliàng 科技|kējì 向善|xiàng_shàn 的|de 航向|hángxiàng 。')
    ],
    questions: [
      {
        stem: '作者指出“工具理性无限膨胀并僭越价值理性”会导致什么危机？',
        options: ['人面临被异化为冷冰冰的数据节点与效率齿轮的危机', '工业生产效率会大幅跌落至农业社会水平', '计算机与自动化设备会彻底停止运转', '所有科学研究都会失去经费支持'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 当工具理性无限膨胀并僭越价值理性时，人便面临被异化为数据节点与效率齿轮的危机。'
      },
      {
        stem: '第二段如何区分“科学”与“人文”的核心使命？',
        options: ['科学求“真”解决“能不能”的手段问题，人文求“善与美”追问“应不应该”的价值归宿', '科学只研究古代历史，人文只研究未来太空技术', '科学追求道德完美，人文追求机械运转效率', '两者毫无区别，都只关心如何创造最大商业利润'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 科学求“真”，解决的是“能不能”的手段问题；人文求“善”与“美”，追问的是“应不应该”的终极价值归宿。'
      },
      {
        stem: '文中“僭越”一词的意思是：',
        options: ['超越本分或界限，取代了本不该由自己主导的地位', '谦虚地向他人学习请教', '沿着既定轨道缓慢前行', '在法律允许的范围内进行创新'],
        correctIndexes: [0],
        explanation: '“僭越” nghĩa là vượt quá giới hạn/bổn phận, lấn át vị trí của lý tính giá trị.'
      },
      {
        stem: '作者理想中的现代文明应如何处理科技与人文的关系？（请选择2个正确答案）',
        options: ['在保持必要张力中实现科技与人文的双向校准', '以科技赋能人类解放，以人文照亮科技向善的航向', '用技术理性彻底消灭一切哲学、文学与艺术思考', '为了保护人文传统而全面禁止任何前沿科技研发'],
        correctIndexes: [0, 1],
        explanation: 'Câu cuối nêu rõ mối quan hệ hiệu chuẩn hai chiều (双向校准) giữa khoa học kỹ thuật và tinh thần nhân văn.'
      }
    ]
  },
  {
    id: 'p_hsk9_03',
    level: 9,
    setIndex: 3,
    title: '历史书写中的“宏大叙事”与“微观史学”',
    paragraphs: [
      p('传统|chuántǒng 史学|shǐxué 往往|wǎngwǎng 偏重|piānzhòng 王朝|wángcháo 兴替|xīngtì 、 制度|zhìdù 沿革|yángé 与|yǔ 重大|zhòngdà 战役|zhànyì 等|děng “宏大|hóngdà 叙事|xùshì” ， 而|ér 普通|pǔtōng 个体|gètǐ 的|de 悲欢|bēihuān 离合|líhé 则|zé 常|cháng 被|bèi 湮没|yānmò 于|yú 时代|shídài 洪流|hóngliú 之中|zhīzhōng 。 二十世纪|èrshí_shìjì 下半叶|xiàbànyè 兴起|xīngqǐ 的|de “微观|wēiguān 史学|shǐxué” ， 则|zé 将|jiāng 镜头|jìngtóu 聚焦|jùjiāo 于|yú 书信|shūxìn 、 日记|rìjì 、 契约|qìyuē 与|yǔ 地方|dìfang 档案|dàng’àn 中的|zhōng_de 芸芸众生|yúnyún-zhòngshēng 。'),
      p('通过|tōngguò “以小见大|yǐ_xiǎo_jiàn_dà” 的|de 还原|huányuán ， 微观|wēiguān 史学|shǐxué 揭示|jiēshì 了|le 宏观|hóngguān 制度|zhìdù 在|zài 日常|rìcháng 肌理|jīlǐ 中的|zhōng_de 真实|zhēnshí 运作|yùnzuò 逻辑|luójí 。 当然|dāngrán ， 若|ruò 沉溺|chénnì 于|yú 琐碎|suǒsuì 细节|xìjié 而|ér 丧失|sàngshī 整体|zhěngtǐ 问题|wèntí 意识|yìshí ， 史学|shǐxué 亦|yì 会|huì 沦为|lúnwéi 碎片化|suìpiànhuà 的|de 掌故|zhǎnggù 猎奇|lièqí 。 唯有|wéiyǒu 将|jiāng 宏观|hóngguān 视野|shìyě 与|yǔ 微观|wēiguān 洞察|dòngchá 融会贯通|rónghuì-guàntōng ， 历史|lìshǐ 画卷|huàjuàn 方能|fāngnéng 既|jì 有|yǒu 骨架|gǔjià 之|zhī 雄浑|xiónghún ， 又|yǒu 血肉|xuèròu 之|zhī 温度|wēndù 。')
    ],
    questions: [
      {
        stem: '“微观史学”与传统“宏大叙事”在研究对象上有何显著不同？',
        options: ['微观史学聚焦于书信、日记、契约与档案中的普通个体与日常生活', '微观史学只研究帝王将相的宫廷权谋与大型战争', '微观史学完全不参考任何历史文献与档案材料', '微观史学只研究微生物在古代的演化过程'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 微观史学将镜头聚焦于书信、日记、契约与地方档案中的芸芸众生。'
      },
      {
        stem: '作者指出了“微观史学”如果走向极端会存在什么弊端？',
        options: ['若沉溺于琐碎细节而丧失整体问题意识，会沦为碎片化的掌故猎奇', '会导致所有历史档案被彻底销毁', '会让历史著作的字数变得过少无法出版', '会完全否定一切普通民众在历史中的作用'],
        correctIndexes: [0],
        explanation: 'Đoạn 2: 若沉溺于琐碎细节而丧失整体问题意识，史学亦会沦为碎片化的掌故猎奇。'
      },
      {
        stem: '文中“芸芸众生”指的是：',
        options: ['普通的众多百姓与平凡个体', '高居庙堂之上的统治阶层', '森林与海洋中的珍稀动植物', '专门从事历史研究的学术权威'],
        correctIndexes: [0],
        explanation: '“芸芸众生” chỉ đông đảo chúng sinh, những con người bình thường trong xã hội.'
      },
      {
        stem: '作者认为理想的历史书写应当达到怎样的境界？（请选择2个正确答案）',
        options: ['将宏观视野与微观洞察融会贯通', '既有宏观结构骨架之雄浑，又有具体个体血肉之温度', '彻底抛弃制度与时代背景，只记录孤立的奇闻轶事', '只记录宏观朝代更替，抹去所有普通人的生活痕迹'],
        correctIndexes: [0, 1],
        explanation: 'Câu cuối: 唯有将宏观视野与微观洞察融会贯通，历史画卷方能既有骨架之雄浑，又有血肉之温度。'
      }
    ]
  },
  {
    id: 'p_hsk9_04',
    level: 9,
    setIndex: 4,
    title: '翻译的“可译性”限度与文化创生',
    paragraphs: [
      p('跨语言|kuà_yǔyán 翻译|fānyì 从来|cónglái 不是|búshì 机械|jīxiè 的|de 符号|fúhào 等值|děngzhí 替换|tìhuàn 。 由于|yóuyú 不同|bùtóng 民族|mínzú 在|zài 历史|lìshǐ 境遇|jìngyù 、 思维|sīwéi 范式|fànshì 与|yǔ 审美|shěnměi 意象|yìxiàng 上|shàng 的|de 深刻|shēnkè 差异|chāyì ， 某些|mǒuxiē 植根|zhígēn 于|yú 本土|běntǔ 语境|yǔjìng 的|de 核心|héxīn 范畴|fànchóu （ 如|rú 中国|Zhōngguó 古典|gǔdiǎn 哲学|zhéxué 中的|zhōng_de “道|dào” 、 “气|qì” 、 “境界|jìngjiè” ） 往往|wǎngwǎng 触及|chùjí “可译性|kěyìxìng 的|de 限度|xiàndù” 。'),
      p('然而|rán’ér ， 正是|zhèngshì 这种|zhèzhǒng “不可译|bùkěyì 之|zhī 处|chù” ， 构成了|gòuchéng_le 跨文化|kuà_wénhuà 对话|duìhuà 最|zuì 富|fù 创造力|chuàngzàolì 的|de 地带|dìdài 。 优秀的|yōuxiù_de 译者|yìzhě 通过|tōngguò 深度|shēndù 阐释|chǎnshì 、 语境|yǔjìng 重构|chónggòu 与|yǔ 创造性|chuàngzàoxìng 转化|zhuǎnhuà ， 在|zài 目标语|mùbiāoyǔ 中|zhōng 开辟|kāipì 出|chū 新的|xīn_de 表意|biǎoyì 空间|kōngjiān ， 使|shǐ 异质|yìzhì 文化|wénhuà 在|zài 碰撞|pèngzhuàng 与|yǔ 互鉴|hùjiàn 中|zhōng 实现|shíxiàn 意义的|yìyì_de 再生产|zài_shēngchǎn 。')
    ],
    questions: [
      {
        stem: '为什么跨语言翻译不能被视为简单的“机械符号等值替换”？',
        options: ['因为不同民族在历史境遇、思维范式与审美意象上存在深刻差异', '因为世界上所有语言的语法结构都是完全相同的', '因为词典编纂者故意隐瞒了部分词汇的含义', '因为计算机翻译软件已经能够做到百分之百完美对译'],
        correctIndexes: [0],
        explanation: 'Đoạn 1: 由于不同民族在历史境遇、思维范式与审美意象上的深刻差异……'
      },
      {
        stem: '作者提及中国古典哲学中的“道”、“气”、“境界”，是为了说明什么？',
        options: ['深度植根于本土文化语境的核心范畴往往难以在其他语言中找到完全现成的对等词', '中国古典哲学词汇数量太少，无法表达复杂思想', '这些词汇只存在于口语中，从未出现在书面文献里', '外国人不需要了解任何中国古典哲学概念'],
        correctIndexes: [0],
        explanation: 'Đoạn 1 dùng các phạm trù “道”, “气”, “境界” làm ví dụ cho giới hạn khả dịch (可译性的限度).'
      },
      {
        stem: '面对“可译性的限度”，优秀的译者是如何实现文化沟通的？（请选择2个正确答案）',
        options: ['通过深度阐释、语境重构与创造性转化', '在目标语中开辟新的表意空间，实现意义的再生产', '遇到难译的词汇直接删去整段原文不译', '直接用拼音或乱码代替所有哲学概念'],
        correctIndexes: [0, 1],
        explanation: 'Đoạn 2: 通过深度阐释、语境重构与创造性转化，在目标语中开辟出新的表意空间，实现意义的再生产。'
      },
      {
        stem: '这段文字对跨文化翻译的最高价值做出了怎样的评价？',
        options: ['翻译不仅是语言转换，更是促进异质文化互鉴与意义创生的桥梁', '翻译的唯一价值在于帮助游客在餐厅点菜', '任何翻译都会彻底毁掉原作的艺术价值，因此不应翻译文学作品', '只有字对字的直译才是唯一正确的翻译标准'],
        correctIndexes: [0],
        explanation: 'Ý chính toàn bài: Dịch thuật vượt qua giới hạn ngôn từ để kiến tạo không gian biểu đạt mới và giao lưu văn hóa.'
      }
    ]
  }
];

export function getPassagesForLevel(level, preferredSetIndex = 0, excludeIds = new Set()) {
  const lv = Number(level) || 1;
  const exact = READING_PASSAGES.filter((item) => item.level === lv);
  const pool = exact.length > 0 ? exact : READING_PASSAGES.filter((item) => item.level >= 6);

  if (preferredSetIndex >= 1 && preferredSetIndex <= 4) {
    const primary = pool.filter((item) => item.setIndex === preferredSetIndex);
    const nextIdx = (preferredSetIndex % 4) + 1;
    const secondary = pool.filter((item) => item.setIndex === nextIdx);
    const others = pool.filter((item) => item.setIndex !== preferredSetIndex && item.setIndex !== nextIdx);
    return [...primary, ...secondary, ...others];
  }

  const unseen = pool.filter((item) => !excludeIds.has(item.id));
  const seen = pool.filter((item) => excludeIds.has(item.id));
  return [...unseen, ...seen];
}
