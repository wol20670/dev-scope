import type { CodeLang } from '../../ui/CodeBlock'

export type LayerId = 'browser' | 'server' | 'controller' | 'service' | 'repository' | 'database'

export interface Layer {
  id: LayerId
  name: string
  sub: string
  role: string
  code: { lang: CodeLang; title: string; source: string }
}

export const layers: Layer[] = [
  {
    id: 'browser',
    name: 'Browser',
    sub: 'fetch / XHR',
    role: '사용자의 클릭을 HTTP 요청으로 바꿔 서버에 보내고, 응답(JSON)을 받아 화면을 갱신한다. 요청에는 메서드, 경로, 헤더(Accept 등)가 담긴다.',
    code: {
      lang: 'typescript',
      title: 'product-api.ts',
      source: `const res = await fetch('/api/products/1', {
  headers: { Accept: 'application/json' },
})
if (!res.ok) throw new Error(\`HTTP \${res.status}\`)
const product: { id: number; name: string; price: number } = await res.json()`,
    },
  },
  {
    id: 'server',
    name: 'Server',
    sub: 'Tomcat · DispatcherServlet',
    role: '내장 웹 서버(Spring Boot 기본값은 Tomcat)가 HTTP 요청을 받아 스레드에 할당한다. 서블릿 필터를 거친 뒤 DispatcherServlet이 HandlerMapping으로 요청을 처리할 컨트롤러 메서드를 찾는다.',
    code: {
      lang: 'yaml',
      title: 'application.yml',
      source: `server:
  port: 8080
  tomcat:
    threads:
      max: 200 # 동시에 요청을 처리할 수 있는 최대 작업 스레드 수`,
    },
  },
  {
    id: 'controller',
    name: 'Controller',
    sub: '@RestController',
    role: 'HTTP 요청을 해석(경로 변수, 쿼리, 바디)하고 서비스를 호출한 뒤, 결과를 응답으로 돌려준다. 반환한 객체는 HttpMessageConverter(Jackson)가 JSON으로 직렬화한다. 비즈니스 로직은 두지 않는다.',
    code: {
      lang: 'java',
      title: 'ProductController.java',
      source: `@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("/{id}")
    public ProductResponse getProduct(@PathVariable Long id) {
        return productService.getProduct(id); // → JSON 직렬화
    }
}`,
    },
  },
  {
    id: 'service',
    name: 'Service',
    sub: '@Service · @Transactional',
    role: '비즈니스 규칙을 담고 트랜잭션 경계를 정한다. 여러 리포지토리를 조합하고, 엔티티를 응답용 DTO로 변환한다.',
    code: {
      lang: 'java',
      title: 'ProductService.java',
      source: `@Service
@Transactional(readOnly = true)
public class ProductService {
    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public ProductResponse getProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));
        return ProductResponse.from(product);
    }
}`,
    },
  },
  {
    id: 'repository',
    name: 'Repository',
    sub: 'Spring Data JPA',
    role: '데이터 접근을 담당한다. Spring Data JPA는 인터페이스만 선언하면 구현체를 만들어 주고, JPA(Hibernate)가 엔티티 조회를 SQL로 바꿔 실행한다.',
    code: {
      lang: 'java',
      title: 'ProductRepository.java',
      source: `public interface ProductRepository extends JpaRepository<Product, Long> {
    // findById(id)는 JpaRepository가 기본 제공한다
}

@Entity
public class Product {
    @Id @GeneratedValue
    private Long id;
    private String name;
    private int price;
}`,
    },
  },
  {
    id: 'database',
    name: 'Database',
    sub: 'MySQL · PostgreSQL …',
    role: '커넥션 풀에서 빌린 커넥션으로 전달된 SQL을 실행하고 결과 행을 돌려준다. 인덱스가 있으면 기본 키로 빠르게 행을 찾는다.',
    code: {
      lang: 'sql',
      title: 'Hibernate가 생성하는 SQL (예시)',
      source: `select p.id, p.name, p.price
  from product p
 where p.id = ?   -- 바인딩: 1`,
    },
  },
]

export interface HttpStep {
  layer: LayerId
  direction: 'idle' | 'request' | 'response'
  title: string
  /** 계층 사이를 오가는 데이터 */
  payload: string
  description: string
}

export const httpSteps: HttpStep[] = [
  {
    layer: 'browser',
    direction: 'idle',
    title: '요청 전',
    payload: '—',
    description: '"API 요청 보내기"를 누르거나 다음 단계로 이동해 GET /api/products/1 요청을 따라가 보자. 각 계층을 클릭하면 역할과 코드를 볼 수 있다.',
  },
  {
    layer: 'browser',
    direction: 'request',
    title: '브라우저가 요청 전송',
    payload: 'GET /api/products/1\nAccept: application/json',
    description: '브라우저가 HTTP 요청을 만든다. (실제로는 DNS 조회, TCP/TLS 연결 등이 먼저 일어나지만 여기서는 생략한다.)',
  },
  {
    layer: 'server',
    direction: 'request',
    title: '웹 서버 → DispatcherServlet',
    payload: 'HttpServletRequest',
    description: '내장 Tomcat이 요청을 받아 작업 스레드에 할당하고 HttpServletRequest 객체로 만든다. 필터 체인을 지나 DispatcherServlet이 /api/products/{id}에 매핑된 핸들러를 찾는다.',
  },
  {
    layer: 'controller',
    direction: 'request',
    title: 'Controller가 요청 해석',
    payload: 'getProduct(id = 1)',
    description: '@GetMapping("/{id}") 메서드가 선택되고, 경로의 "1"이 @PathVariable Long id로 변환된다. 컨트롤러는 서비스에 처리를 위임한다.',
  },
  {
    layer: 'service',
    direction: 'request',
    title: 'Service: 트랜잭션 시작',
    payload: 'productRepository.findById(1)',
    description: '@Transactional 프록시가 트랜잭션을 시작한 뒤 서비스 메서드를 호출한다. 서비스는 비즈니스 규칙에 따라 리포지토리에 조회를 요청한다.',
  },
  {
    layer: 'repository',
    direction: 'request',
    title: 'Repository: SQL 생성',
    payload: 'select … from product where id = ?',
    description: '영속성 컨텍스트에 id=1 엔티티가 없으므로 Hibernate가 SQL을 만들어 커넥션 풀의 커넥션으로 DB에 보낸다.',
  },
  {
    layer: 'database',
    direction: 'request',
    title: 'Database: 쿼리 실행',
    payload: 'row(id=1, name="키보드", price=59000)',
    description: 'DB가 기본 키 인덱스로 행을 찾아 결과를 돌려준다. 이제부터 응답이 반대 방향으로 이동한다.',
  },
  {
    layer: 'repository',
    direction: 'response',
    title: 'Repository: 엔티티로 변환',
    payload: 'Optional<Product>',
    description: 'Hibernate가 결과 행을 Product 엔티티로 만들고 영속성 컨텍스트에 보관한 뒤 반환한다.',
  },
  {
    layer: 'service',
    direction: 'response',
    title: 'Service: DTO 변환 · 커밋',
    payload: 'ProductResponse(1, "키보드", 59000)',
    description: '서비스가 엔티티를 응답용 DTO로 바꾼다. 메서드가 끝나면 트랜잭션 프록시가 트랜잭션을 커밋한다(읽기 전용이므로 변경 사항은 없다).',
  },
  {
    layer: 'controller',
    direction: 'response',
    title: 'Controller: JSON 직렬화',
    payload: '{"id":1,"name":"키보드","price":59000}',
    description: '컨트롤러가 DTO를 반환하면 HttpMessageConverter(Jackson)가 Accept 헤더에 맞춰 JSON으로 직렬화한다.',
  },
  {
    layer: 'server',
    direction: 'response',
    title: '서버: HTTP 응답 작성',
    payload: 'HTTP/1.1 200 OK\nContent-Type: application/json',
    description: 'DispatcherServlet과 Tomcat이 상태 코드, 헤더, 바디를 HTTP 응답으로 써서 보낸다. 요청을 처리한 스레드는 풀로 돌아간다.',
  },
  {
    layer: 'browser',
    direction: 'response',
    title: '브라우저: 응답 수신',
    payload: '{"id":1,"name":"키보드","price":59000}',
    description: 'fetch의 Promise가 Response로 이행되고, res.json()으로 파싱한 데이터로 화면을 갱신한다. 요청 한 번이 6개 계층을 왕복했다.',
  },
]

export const layerIndex = (id: LayerId) => layers.findIndex((l) => l.id === id)
