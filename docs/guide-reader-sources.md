# 指南浮窗内容来源与范围

核查日期：2026-11-17。内置概览对应 `src/data/guide-reader-content.ts`，新增图文攻略对应 `content/imports/xhs-2026-11.json`。

## 1.39 新增图文攻略

用户提供的十二篇经验笔记已归并为十篇中俄文章并导入原有分区，配图二十六张。文章材料、路线与当前官方补充分别核对；不把经验中的费用、等候时间和免预约说法作为通用保证。公开作者为站内整理笔名「小途 · StudentPath」，按用户要求不显示原笔记链接及原作者署名。

- 体检／指纹与外住登记：[莫大到校说明](https://international.msu.ru/after)、[院系外事联系方式](https://international.msu.ru/faculties)、[131 医院服务页](https://dgp131.mos.ru/paid_services/)。具体冲突和适用范围见 `research/official-medical-v139.md`。
- 社会卡与 СНИЛС：[莫大学生证件说明](https://international.msu.ru/student_documents)、[俄罗斯社会基金办理说明](https://sfr.gov.ru/grazhdanam/personificirovannyj_uchet/registraciya_i_oformlenie_snils/)。
- 手机账户：[MTS 外国人 SIM 卡说明](https://support.mts.ru/mts_mobilnaya_svyaz/oformlenie-novoi-sim-karti/kak-inostrannomu-grazhdaninu-oformit-sim-kartu)，页面更新于 2026-10-29；银行与软件条目分别使用机构／产品官方资料，见 `research/official-daily-v139.md`。
- 预科到校：[莫大俄语语言文化学院接待部门](https://irlc.msu.ru/about_institute/structure/reception_department)、[抵达说明](https://irlc.msu.ru/applicants/how_to_come_to_full_time_training/arrival_to_moscow)。不把旧笔记中的房号写成现行安排。

新增文章使用独立稳定 ID 与 2–3 个段落，不更改下述原七篇概览或旧个人进度。现场照片和操作截图为参考，未采用个人证件实拍或旧版登记表作为当前模板。导入与验证记录见 `research/content-import-v139.md`。

## 以下为保留的内置概览范围

本轮保留七条指南及各自原有三个概览步骤，增加可展开的准备说明。它不是十二条完整指南的交付，也不是逐项核实后的完整办理材料库。

## 已阅读的官方页面

- [МГУ 国际事务：После приезда](https://international.msu.ru/after)。本次浏览确认页面包含初次登记、变更住宿、医疗检查、签证延期及登记延期等部分。
- 新增内容仅摘取少量文件类别作为核对线索，并在相关步骤连接到该页面。页面未给出可确认的内容更新时间；其具体收费、期限、照片规格、机构地址和完整清单未写入本轮数据，不能据此认为全部条件已核实或适用于所有学校。
- 签证材料参考涵盖护照与签证、移民卡、登记、入学或学习关系文件；登记参考区分宿舍情境；医疗参考指向身份、登记和学生身份相关文件。页面内的实际清单与适用范围须继续向负责部门确认。相关指南的 `review-needed` 状态保持不变。
- 银行、招生、城市交通没有新增具体机构要求。其展开项是向所选机构索取清单、整理问题和保存答复的个人准备方法，不伪装成已核实材料要求。

## 图示与身份

作者统一为 StudentPath 编辑整理，不冒用学校或具体工作人员身份。图示为原创结构示意，不使用真实护照、签证、健康报告、住址、银行卡或政府徽记，不是有效文件或官方模板；图片注释说明的是该步骤的整理方法。

## 与旧记录的对应

每条指南依然只有三个进度项，`legacyIndex` 固定为 `0 / 1 / 2`，保持 `home:v2` 完成标记与旧版概览语义一致。稳定 `id` 用于条目标识，不能把图示页数、材料行数或阅读位置作为新增完成数。
