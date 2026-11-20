# 首页实拍图片来源

## 星空首页的莫斯科摄影

九张原作均按 [Unsplash License](https://unsplash.com/license) 使用，供首页测试版三个章节展示。本地 JPEG 位于 `public/images/moscow/`，按屏幕大小等比裁切。作者、作品与文件如下。

| 场景 | 本地文件 | 摄影与原作 |
| --- | --- | --- |
| 雪中的圣瓦西里大教堂 | basil.jpg | [Eugeniya Belova](https://unsplash.com/photos/G42-OvxDAn8) |
| 莫斯科河与克里姆林宫 | kremlin-day.jpg | [Viktor SOLOMONIK](https://unsplash.com/photos/iRLZWPATf-w) |
| 扎里亚季耶公园 | zaryadye.jpg | [maks_d](https://unsplash.com/photos/KRHwD2G-Plg) |
| 什柳佐瓦亚河岸的秋天 | autumn.jpg | [Natalia Trofimova](https://unsplash.com/photos/814dhPJRgW4) |
| 察里津诺公园石塔 | tsaritsyno.jpg | [Oleg Podlesnykh](https://unsplash.com/photos/hcP7_E7ra58) |
| 春日花园 | spring.jpg | [Yoksel Zok](https://unsplash.com/photos/2tZuY1d5Pfk) |
| 莫斯科日落 | sunset.jpg | [Anton Savinov](https://unsplash.com/photos/D9tXei8ASh4) |
| 城市雪夜 | snowfall.jpg | [Ivan Lapyrin](https://unsplash.com/photos/9rGjL68h5N8) |
| 夜间的克里姆林宫河岸 | kremlin-night.jpg | [Nikolai Kolosov](https://unsplash.com/photos/c1jsNO7W4T8) |

## 首页校徽带

以下图形取自学校公开页面，用于识别院校。图形等比存为本地 PNG；莫大和友大从校方组合标中提取独立图徽。

| 文件（`public/images/universities/`） | 校方素材 |
| --- | --- |
| msu.png | [莫大视觉识别手册](https://brandbook.msu.ru/) · [原图](https://static.tildacdn.com/tild6332-3061-4333-a364-616266613963/znak1.png) |
| rudn.png | [友大视觉识别](https://handbook.rudn.ru/about/style.html) · [原图](https://handbook.rudn.ru/img/logo_new.svg) |
| spbu.png | [圣彼得堡国立大学标志](https://spbu.ru/themes/spbgu/markup/dist/android-chrome-192x192.png) |
| kfu.png | [喀山联邦大学标志](https://eng.kpfu.ru/wp-content/themes/kpfu2/images/logo_white_mobile.svg) |
| hse.png | [高等经济大学标志](https://www.hse.ru/f/src/global/i/favicon/favicon_ios_180x180.png) |
| itmo.png | [ITMO 官网页脚白色字标](https://itmo.ru/) |
| mipt.png | [莫斯科物理技术学院标志](https://mipt.ru/f/media/favicons/apple-touch-icon.png) |
| spbpu.png | [圣彼得堡彼得大帝理工大学标志](https://www.spbstu.ru/local/templates/main/img/apple-touch-icon.png) |
| misis.png | [MISIS 大学标志](https://misis.ru/f/src/images/icon-128.png) |
| mephi.png | [莫斯科国立核能研究大学标志](https://mephi.ru/content/public/images/mephi-header-logo.png) |

## 校园与城市摄影

核对日期：2026-11-16。以下三幅为摄影师公开发布的真实照片，均在 Wikimedia Commons 文件说明页确认了作者、场景和 CC BY 4.0 许可。图片为历史实拍，不代表校园或城市的实时状态。

统一署名：**© Vyacheslav Argenberg**。

许可：[Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)。网站使用时保留作者署名、原文件说明页链接和许可链接，并说明展示裁切与压缩。作者未背书本项目。

| 本地资源 | 已确认场景／拍摄日期 | 原文件说明页 | 处理 |
| --- | --- | --- | --- |
| `public/images/msu-main.jpg` | 从罗蒙诺索夫广场望向 МГУ 主楼；2012-10-13 | [Moscow State University, Main building, Moscow, Russia.jpg](https://commons.wikimedia.org/wiki/File:Moscow_State_University,_Main_building,_Moscow,_Russia.jpg) | 使用 Wikimedia 1920px JPEG 缩放版本；网页按容器裁切展示 |
| `public/images/moscow-city.jpg` | 从大莫斯科河桥望向莫斯科河与克里姆林宫；2011-06-28 | [Moskva River and Kremlin from Bolshoy Moskvoretsky Bridge, Moscow, Russia.jpg](https://commons.wikimedia.org/wiki/File:Moskva_River_and_Kremlin_from_Bolshoy_Moskvoretsky_Bridge,_Moscow,_Russia.jpg) | 下载原始照片后等比缩放至 1920px 宽，JPEG 质量 86；网页按容器裁切展示 |
| `public/images/campus-life.jpg` | МГУ 植物园秋日高处景观；2012-10-13 | [Moscow State University, Botanical Gardens, Moscow, Russia.jpg](https://commons.wikimedia.org/wiki/File:Moscow_State_University,_Botanical_Gardens,_Moscow,_Russia.jpg) | 使用 Wikimedia 1920px JPEG 缩放版本；网页按容器裁切展示 |

未改变照片场景，未移除／添加建筑或人物。页面使用的深色遮罩只是文字可读性处理，不是对历史场景的修改。`campus-life.jpg` 是内部文件名，页面说明应写“МГУ 植物园”，不可称为学生活动实拍。

## 本地资源与显示建议

- `msu-main.jpg`：1920 × 1445；主楼塔尖位于画面上部中央。宽屏 `object-fit: cover` 推荐 `object-position: 50% 0%` 或 `50% 10%`，避免切掉塔尖；窄屏保持横向居中。
- `moscow-city.jpg`：1920 × 1276；推荐中心裁切，保留左侧塔楼与中间教堂；文件名中的“city”仅表示城市场景。
- `campus-life.jpg`：1920 × 1276；推荐中心裁切，保留植物园纵向步道与树木。

页面元数据位于 `src/data/home-images.ts`。三个 `creditUrl` 指向具体原文件说明页，`license` 均为 `CC BY 4.0`；公共许可链接为上文地址。
