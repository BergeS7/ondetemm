import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CompanyManager } from "@/features/companies/company-manager";
import { api } from "@/lib/api";
vi.mock("@/features/auth/auth-provider",()=>({useAuth:()=>({user:{id:"owner"}})}));
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it("opens the manager with the catalog cache populated by the home page",async()=>{
 const states=[{id:"state",name:"Maranhão",code:"MA"}];
 const cities=[{id:"city",state_id:"state",name:"Santa Inês",slug:"santa-ines"}];
 const company={id:"company",name:"Empresa Teste",status:"ACTIVE",state_id:"state",city_id:"city",slug:"teste",category_ids:[],short_description:"Empresa local",description:"Descrição da empresa"};
 const page=(data:unknown[])=>({data,pagination:{page:1,limit:100,total:data.length,totalPages:1}});
 vi.spyOn(api,"request").mockImplementation(async <T,>(path:string):Promise<T>=>{
 if(path==="/companies/company")return company as T;
 if(path.startsWith("/states?"))return page(states) as T;
 if(path.includes("/cities?"))return page(cities) as T;
 return page([]) as T;
 });
 const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:60000}}});
 client.setQueryData(["states"],states);
 client.setQueryData(["cities","state"],cities);
 render(<QueryClientProvider client={client}><CompanyManager id="company"/></QueryClientProvider>);
 expect(await screen.findByRole("heading",{name:"Empresa Teste"})).toBeTruthy();
 expect(await screen.findByRole("link",{name:"Ver perfil público"})).toHaveProperty("href",expect.stringContaining("/ma/santa-ines/teste"));
 expect(screen.getByRole("button",{name:"Dados e contatos"})).toBeTruthy();
 expect(client.getQueryData(["states"])).toEqual(states);
});
