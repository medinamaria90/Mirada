# Créditos de las imágenes

Las imágenes `app/img/a<N>.jpg` proceden de la colección «image-data» (240 obras maestras de la
pintura, con metadatos originales en ruso), redimensionadas a un máximo de 1000 px y
recomprimidas en JPEG sin metadatos para la web.

Son **reproducciones fotográficas de obras de arte en dominio público**: todos los pintores
incluidos fallecieron antes de 1956 y todas las obras son anteriores a 1930. Las reproducciones
fieles de obras bidimensionales de dominio público no generan nuevos derechos de autor en la
mayoría de las jurisdicciones; aun así, la procedencia exacta de cada fotografía (museo o
archivo) no está registrada en la colección de origen.

Títulos, años y atribuciones se han revisado y corregido a mano frente a los metadatos
originales (véase `tools/catalog_data.py`); las obras con datos no confirmados del todo llevan
`confidence: "medium"` en `catalog.json`.

## Obras añadidas en la oleada 4 (`img/b1.jpg` … `img/b37.jpg`)

Proceden de la colección «knack-paintings» (github.com/lorien-danger/knack-paintings, declarada
CC0 1.0), que reúne reproducciones de Wikimedia Commons de obras en dominio público. Se han
incorporado tal cual (máx. 640 px, sin metadatos), salvo b6 y b7, trípticos de los que solo se
publica la tabla central (recorte con ImageMagick). Títulos y años en español escritos y revisados
a mano. Archivo de Commons de cada una y licencia que declara Commons:

- `b1` Miguel Ángel, *El Juicio Final* (1536–1541) — https://commons.wikimedia.org/wiki/File:Last_Judgement_(Michelangelo).jpg — Public domain
- `b2` Francisco de Goya, *Saturno devorando a su hijo* (c. 1820–1823) — https://commons.wikimedia.org/wiki/File:Francisco_de_Goya,_Saturno_devorando_a_su_hijo_(1819-1823).jpg — Public domain
- `b3` Francisco de Goya, *La maja desnuda* (c. 1797–1800) — https://commons.wikimedia.org/wiki/File:Maja_desnuda_(museo_del_Prado).jpg — Public domain
- `b4` El Greco, *El entierro del conde de Orgaz* (1586–1588) — https://commons.wikimedia.org/wiki/File:El_Greco_-_The_Burial_of_the_Count_of_Orgaz.JPG — Public domain
- `b5` El Greco, *Vista de Toledo* (c. 1599–1600) — https://commons.wikimedia.org/wiki/File:El_Greco_View_of_Toledo.jpg — Public domain
- `b6` Pedro Pablo Rubens, *La elevación de la cruz (tabla central)* (1610–1611) — https://commons.wikimedia.org/wiki/File:Peter_Paul_Rubens_-_Raising_of_the_Cross_(Cathedral_of_Antwerp).jpg — Public domain
- `b7` Pedro Pablo Rubens, *El descendimiento de la cruz (tabla central)* (1612–1614) — https://commons.wikimedia.org/wiki/File:Peter_Paul_Rubens_-_Descent_from_the_Cross_-_WGA20212.jpg — Public domain
- `b8` Jan van Eyck, *La Virgen del canciller Rolin* (c. 1435) — https://commons.wikimedia.org/wiki/File:The_Virgin_with_Chancellor_Rolin_by_Jan_van_Eyck_(Louvre).webp — Public domain
- `b9` El Bosco, *La nave de los necios* (c. 1500) — https://commons.wikimedia.org/wiki/File:Jheronimus_Bosch_011.jpg — Public domain
- `b10` Alberto Durero, *Autorretrato con abrigo de pieles* (1500) — https://commons.wikimedia.org/wiki/File:D%C3%BCrer_Alte_Pinakothek.jpg — Public domain
- `b11` Caravaggio, *La vocación de san Mateo* (1599–1600) — https://commons.wikimedia.org/wiki/File:Caravaggio_%E2%80%94_The_Calling_of_Saint_Matthew.jpg — CC0
- `b12` Caravaggio, *Judit decapitando a Holofernes* (c. 1598–1599) — https://commons.wikimedia.org/wiki/File:Judith_Beheading_Holofernes-Caravaggio_(c.1598-9).jpg — Public domain
- `b13` Caravaggio, *La cena de Emaús* (1601) — https://commons.wikimedia.org/wiki/File:Caravaggio_-_Supper_at_Emmaus_-_National_Gallery_London.jpeg — Public domain
- `b14` Johannes Vermeer, *Vista de Delft* (c. 1660–1661) — https://commons.wikimedia.org/wiki/File:Johannes_Vermeer_-_View_of_Delft_-_92_-_Mauritshuis.jpg — Public domain
- `b15` Vincent van Gogh, *Los comedores de patatas* (1885) — https://commons.wikimedia.org/wiki/File:De_aardappeleters_-_s0005V1962_-_Van_Gogh_Museum.jpg — Public domain
- `b16` Claude Monet, *Mujer con sombrilla (Madame Monet y su hijo)* (1875) — https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Woman_with_a_Parasol_-_Madame_Monet_and_Her_Son_-_Google_Art_Project.jpg — Public domain
- `b17` Claude Monet, *La urraca* (1868–1869) — https://commons.wikimedia.org/wiki/File:Claude_Monet_-_The_Magpie_-_Google_Art_Project.jpg — Public domain
- `b18` Edgar Degas, *La absenta* (1875–1876) — https://commons.wikimedia.org/wiki/File:Edgar_Degas_-_In_a_Caf%C3%A9_-_Google_Art_Project_2.jpg — Public domain
- `b19` Édouard Manet, *Olimpia* (1863) — https://commons.wikimedia.org/wiki/File:Edouard_Manet_-_Olympia_-_Google_Art_Project_3.jpg — Public domain
- `b20` Paul Cézanne, *Los jugadores de cartas* (1890–1895) — https://commons.wikimedia.org/wiki/File:Les_Joueurs_de_cartes,_par_Paul_C%C3%A9zanne.jpg — Public domain
- `b21` Paul Cézanne, *Las grandes bañistas* (1898–1905) — https://commons.wikimedia.org/wiki/File:Paul_C%C3%A9zanne,_French_-_The_Large_Bathers_-_Google_Art_Project.jpg — Public domain
- `b22` Paul Gauguin, *El Cristo amarillo* (1889) — https://commons.wikimedia.org/wiki/File:Paul_Gauguin_-_The_Yellow_Christ_(Le_Christ_jaune)_1889.jpg — Public domain
- `b23` Paul Gauguin, *La visión después del sermón* (1888) — https://commons.wikimedia.org/wiki/File:La_vision_apr%C3%A8s_le_sermon_(Paul_Gauguin).jpg — Public domain
- `b24` Georges Seurat, *Un domingo en la Grande Jatte* (1884–1886) — https://commons.wikimedia.org/wiki/File:A_Sunday_on_La_Grande_Jatte,_Georges_Seurat,_1884.jpg — Public domain
- `b25` Georges Seurat, *Bañistas en Asnières* (1884) — https://commons.wikimedia.org/wiki/File:Baigneurs_a_Asnieres.jpg — Public domain
- `b26` Henri de Toulouse-Lautrec, *En el Moulin Rouge* (1892–1895) — https://commons.wikimedia.org/wiki/File:Henri_de_Toulouse-Lautrec_-_At_the_Moulin_Rouge_-_1928.610_-_Art_Institute_of_Chicago.jpg — Public domain
- `b27` Henri de Toulouse-Lautrec, *La toilette* (1889) — https://commons.wikimedia.org/wiki/File:(Albi)_Rousse_(La_Toilette)_-_1889_-_Henri_de_Toulouse-Lautrec_-_Mus%C3%A9e_d%27Orsay,_Paris.jpg — Public domain
- `b28` Eugène Delacroix, *La muerte de Sardanápalo* (1827) — https://commons.wikimedia.org/wiki/File:La_Mort_de_Sardanapale_-_Eug%C3%A8ne_Delacroix_-_Mus%C3%A9e_du_Louvre_Peintures_RF_2346.jpg — Public domain
- `b29` Jacques-Louis David, *La muerte de Sócrates* (1787) — https://commons.wikimedia.org/wiki/File:The_Death_of_Socrates_MET_DP-13139-001.jpg — CC0
- `b30` Jacques-Louis David, *La muerte de Marat* (1793) — https://commons.wikimedia.org/wiki/File:Jacques-Louis_David_-_Marat_assassinated_-_Google_Art_Project_2.jpg — Public domain
- `b31` Caspar David Friedrich, *El caminante sobre el mar de nubes* (c. 1817) — https://commons.wikimedia.org/wiki/File:Friedrich,_Caspar_David_-_Wanderer_%C3%BCber_dem_Nebelmeer.jpg — Public domain
- `b32` Caspar David Friedrich, *El mar de hielo* (1823–1824) — https://commons.wikimedia.org/wiki/File:Friedrich,_Caspar_David_-_Eismeer.jpg — Public domain
- `b33` Caspar David Friedrich, *El monje junto al mar* (1808–1810) — https://commons.wikimedia.org/wiki/File:Friedrich,_Caspar_David_-_M%C3%B6nch_am_Meer_-_Alte_Nationalgalerie_in_Berlin.jpg — Public domain
- `b34` J. M. W. Turner, *Lluvia, vapor y velocidad* (1844) — https://commons.wikimedia.org/wiki/File:J._M._W._Turner_-_Rain,_Steam_and_Speed_%E2%80%93_The_Great_Western_Railway.jpg — Public domain
- `b35` J. M. W. Turner, *El Temerario remolcado a su último amarre* (1839) — https://commons.wikimedia.org/wiki/File:Turner,_J._M._W._-_The_Fighting_T%C3%A9m%C3%A9raire_tugged_to_her_last_Berth_to_be_broken.jpg — Public domain
- `b36` Edvard Munch, *La niña enferma* (1885–1886) — https://commons.wikimedia.org/wiki/File:Edvard_Munch_-_The_Sick_Child_-_NG.M.00839_-_National_Museum_of_Art,_Architecture_and_Design.jpg — Public domain
- `b37` Gustav Klimt, *Judit I* (1901) — https://commons.wikimedia.org/wiki/File:Judith_1_(cropped).jpg — Public domain
